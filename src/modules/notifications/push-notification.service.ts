import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma/prisma.service';

// Firebase Admin SDK için tip tanımları
interface FirebaseMessage {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: 'high' | 'normal';
    notification?: {
      channelId?: string;
      icon?: string;
      color?: string;
    };
  };
}

@Injectable()
export class PushNotificationService {
  private firebaseApp: admin.app.App | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Firebase Admin SDK'yı başlat
      if (admin.apps.length === 0) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        console.log('✅ Firebase Admin SDK başlatıldı');
      } else {
        this.firebaseApp = admin.app();
      }
    } catch (error) {
      console.error('❌ Firebase Admin SDK başlatılamadı:', error);
    }
  }

  /**
   * Tek bir kullanıcıya push bildirim gönder
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    try {
      // Kullanıcının FCM token'ını al
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcm_token: true, name: true },
      });

      if (!user?.fcm_token) {
        console.log(`⚠️ Kullanıcı ${userId} için FCM token bulunamadı`);
        return false;
      }

      return await this.sendNotification(user.fcm_token, title, body, data);
    } catch (error) {
      console.error(`❌ Push bildirim gönderme hatası (userId: ${userId}):`, error);
      return false;
    }
  }

  /**
   * Birden fazla kullanıcıya push bildirim gönder
   */
  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: number; failed: number }> {
    const results = await Promise.all(
      userIds.map((userId) => this.sendToUser(userId, title, body, data)),
    );

    return {
      success: results.filter((r) => r).length,
      failed: results.filter((r) => !r).length,
    };
  }

  /**
   * Belirli bir token'a bildirim gönder
   */
  private async sendNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.firebaseApp) {
      console.error('❌ Firebase App başlatılmamış');
      return false;
    }

    const message: FirebaseMessage = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'macagel_notifications',
          icon: 'ic_notification',
          color: '#00A000',
        },
      },
    };

    try {
      const response = await admin.messaging().send(message as admin.messaging.Message);
      console.log(`✅ Push bildirim gönderildi: ${response}`);
      return true;
    } catch (error: any) {
      // Token geçersiz ise veritabanından sil
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        console.log(`🗑️ Geçersiz token siliniyor: ${token.substring(0, 20)}...`);
        await this.removeInvalidToken(token);
      } else {
        console.error('❌ FCM gönderme hatası:', error);
      }
      return false;
    }
  }

  /**
   * Geçersiz token'ı veritabanından sil
   */
  private async removeInvalidToken(token: string): Promise<void> {
    try {
      await this.prisma.user.updateMany({
        where: { fcm_token: token },
        data: { fcm_token: null },
      });
    } catch (error) {
      console.error('❌ Token silme hatası:', error);
    }
  }

  // ========== Hazır Bildirim Şablonları ==========

  /**
   * Yeni mesaj bildirimi
   */
  async sendNewMessageNotification(
    receiverId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string,
  ): Promise<boolean> {
    return this.sendToUser(
      receiverId,
      `${senderName} yeni bir mesaj gönderdi`,
      messagePreview.length > 100
        ? messagePreview.substring(0, 100) + '...'
        : messagePreview,
      {
        type: 'message',
        conversation_id: conversationId,
      },
    );
  }

  /**
   * Arkadaşlık isteği bildirimi
   */
  async sendFriendRequestNotification(
    receiverId: string,
    senderName: string,
    requestId: string,
  ): Promise<boolean> {
    return this.sendToUser(
      receiverId,
      'Yeni Arkadaşlık İsteği',
      `${senderName} sana arkadaşlık isteği gönderdi`,
      {
        type: 'friend_request',
        request_id: requestId,
      },
    );
  }

  /**
   * Arkadaşlık isteği kabul bildirimi
   */
  async sendFriendRequestAcceptedNotification(
    receiverId: string,
    accepterName: string,
  ): Promise<boolean> {
    return this.sendToUser(
      receiverId,
      'Arkadaşlık İsteği Kabul Edildi',
      `${accepterName} arkadaşlık isteğini kabul etti`,
      {
        type: 'friend_request_accepted',
      },
    );
  }

  /**
   * Maça katılım isteği bildirimi (maç sahibine)
   */
  async sendMatchJoinRequestNotification(
    matchOwnerId: string,
    requesterName: string,
    matchTitle: string,
    requestId: string,
    lobbyId: string,
  ): Promise<boolean> {
    return this.sendToUser(
      matchOwnerId,
      'Yeni Katılım İsteği',
      `${requesterName}, "${matchTitle}" maçına katılmak istiyor`,
      {
        type: 'match_join_request',
        request_id: requestId,
        lobby_id: lobbyId,
      },
    );
  }

  /**
   * Maça katılım isteği kabul bildirimi
   */
  async sendMatchJoinAcceptedNotification(
    requesterId: string,
    matchTitle: string,
    lobbyId: string,
  ): Promise<boolean> {
    return this.sendToUser(
      requesterId,
      'Katılım İsteği Kabul Edildi',
      `"${matchTitle}" maçına katılım isteğin kabul edildi`,
      {
        type: 'match_join_accepted',
        lobby_id: lobbyId,
      },
    );
  }

  /**
   * Maça katılım isteği red bildirimi
   */
  async sendMatchJoinRejectedNotification(
    requesterId: string,
    matchTitle: string,
  ): Promise<boolean> {
    return this.sendToUser(
      requesterId,
      'Katılım İsteği Reddedildi',
      `"${matchTitle}" maçına katılım isteğin reddedildi`,
      {
        type: 'match_join_rejected',
      },
    );
  }

  /**
   * Maç daveti bildirimi
   */
  async sendMatchInvitationNotification(
    receiverId: string,
    senderName: string,
    matchTitle: string,
    invitationId: string,
    lobbyId: string,
  ): Promise<boolean> {
    return this.sendToUser(
      receiverId,
      'Maç Daveti',
      `${senderName} seni "${matchTitle}" maçına davet etti`,
      {
        type: 'match_invitation',
        invitation_id: invitationId,
        lobby_id: lobbyId,
      },
    );
  }

  /**
   * Maç hatırlatma bildirimi
   */
  async sendMatchReminderNotification(
    userId: string,
    matchTitle: string,
    timeUntilMatch: string,
    lobbyId: string,
  ): Promise<boolean> {
    return this.sendToUser(
      userId,
      'Maç Hatırlatması',
      `"${matchTitle}" maçına ${timeUntilMatch} kaldı!`,
      {
        type: 'match_reminder',
        lobby_id: lobbyId,
      },
    );
  }

  /**
   * Maç iptal bildirimi
   */
  async sendMatchCancelledNotification(
    userId: string,
    matchTitle: string,
  ): Promise<boolean> {
    return this.sendToUser(
      userId,
      'Maç İptal Edildi',
      `"${matchTitle}" maçı iptal edildi`,
      {
        type: 'match_cancelled',
      },
    );
  }
}

