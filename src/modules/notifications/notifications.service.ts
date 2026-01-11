import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { RespondNotificationDto } from './dto/respond-notification.dto';
import { MessagesGateway } from '../messages/messages.gateway';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MessagesGateway))
    private messagesGateway: MessagesGateway,
    private pushNotificationService: PushNotificationService,
  ) {}

  // Bildirim oluştur
  async createNotification(senderId: string, createNotificationDto: CreateNotificationDto) {
    console.log('🔔 Yeni bildirim oluşturuluyor...', createNotificationDto);

    const notification = await this.prisma.notification.create({
      data: {
        type: createNotificationDto.type,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        sender_id: senderId,
        receiver_id: createNotificationDto.receiverId,
        related_id: createNotificationDto.relatedId,
        metadata: createNotificationDto.metadata,
      },
      include: {
        sender: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
        receiver: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
      },
    });

    console.log('✅ Bildirim oluşturuldu:', notification.id);
    return notification;
  }

  // Kullanıcının bildirimlerini getir
  async getUserNotifications(userId: string) {
    console.log('📱 Kullanıcı bildirimleri getiriliyor...', { userId });

    const notifications = await this.prisma.notification.findMany({
      where: {
        receiver_id: userId,
      },
      include: {
        sender: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    console.log('📊 Bulunan bildirim sayısı:', notifications.length);
    return notifications;
  }

  // Maça katılım isteği gönder
  async sendMatchJoinRequest(userId: string, lobbyId: string) {
    console.log('🤝 Maça katılım isteği gönderiliyor...', { userId, lobbyId });

    // Lobi kontrolü
    const lobby = await this.prisma.matchLobby.findUnique({
      where: { id: lobbyId },
      include: {
        creator: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
      },
    });

    if (!lobby) {
      throw new NotFoundException('Maç lobisi bulunamadı');
    }

    if (lobby.creator_id === userId) {
      throw new BadRequestException('Kendi oluşturduğunuz maça katılım isteği gönderemezsiniz');
    }

    if (lobby.status !== 'open') {
      throw new BadRequestException('Bu lobi katılıma kapalı');
    }

    // Zaten katılım isteği var mı kontrol et
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        type: 'match_join_request',
        sender_id: userId,
        receiver_id: lobby.creator_id,
        related_id: lobbyId,
        status: 'unread',
      },
    });

    if (existingNotification) {
      throw new BadRequestException('Bu maç için zaten katılım isteği gönderilmiş');
    }

    // Kullanıcı bilgisini al
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, surname: true, nickname: true },
    });

    if (!user) {
      throw new BadRequestException('Kullanıcı bulunamadı');
    }

    // Bildirim oluştur
    const notification = await this.createNotification(userId, {
      type: 'match_join_request',
      title: 'Maça Katılım İsteği',
      message: `${user.name} ${user.surname} (@${user.nickname}) "${lobby.title}" maçınıza katılmak istiyor.`,
      receiverId: lobby.creator_id,
      relatedId: lobbyId,
      metadata: {
        lobbyTitle: lobby.title,
        requesterName: `${user.name} ${user.surname}`,
        requesterNickname: user.nickname,
      },
    });

    console.log('✅ Maça katılım isteği gönderildi');
    
    // WebSocket ile bildirim gönder
    try {
      this.messagesGateway.server.to(`user:${lobby.creator_id}`).emit('match-join-request', {
        notificationId: notification.id,
        senderName: `${user.name} ${user.surname}`,
        senderNickname: user.nickname,
        lobbyTitle: lobby.title,
        lobbyId: lobbyId,
        message: notification.message,
      });
      console.log('📱 WebSocket ile maça katılım isteği bildirimi gönderildi');
    } catch (error) {
      console.error('❌ WebSocket bildirim hatası:', error);
    }

    // Push bildirim gönder (FCM token varsa)
    this.pushNotificationService
      .sendMatchJoinRequestNotification(
        lobby.creator_id,
        `${user.name} ${user.surname}`,
        lobby.title,
        notification.id,
        lobbyId,
      )
      .catch((error) => console.error('❌ Push bildirim hatası:', error));
    
    return notification;
  }

  // Bildirime yanıt ver
  async respondToNotification(
    userId: string,
    notificationId: string,
    respondDto: RespondNotificationDto,
  ) {
    console.log('📝 Bildirime yanıt veriliyor...', { notificationId, response: respondDto.response });

    // Bildirim kontrolü
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        sender: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Bildirim bulunamadı');
    }

    if (notification.receiver_id !== userId) {
      throw new BadRequestException('Bu bildirime yanıt verme yetkiniz yok');
    }

    if (notification.status !== 'unread') {
      throw new BadRequestException('Bu bildirim zaten yanıtlanmış');
    }

    // Bildirim tipine göre işlem yap
    if (notification.type === 'match_join_request') {
      return this.handleMatchJoinResponse(notification, respondDto.response);
    }

    throw new BadRequestException('Bilinmeyen bildirim tipi');
  }

  // Maça katılım isteği yanıtını işle
  private async handleMatchJoinResponse(notification: any, response: 'accepted' | 'rejected') {
    console.log('⚽ Maça katılım yanıtı işleniyor...', { response });

    // Bildirimi güncelle
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: response,
        is_read: true,
        updated_at: new Date(),
      },
    });

    const lobby = await this.prisma.matchLobby.findUnique({
      where: { id: notification.related_id },
      select: { title: true, max_players: true, current_players: true },
    });

    if (!lobby) {
      throw new BadRequestException('Maç lobisi bulunamadı');
    }

    if (response === 'accepted') {
      // Maça katılımı gerçekleştir
      await this.prisma.matchParticipant.create({
        data: {
          lobby_id: notification.related_id,
          user_id: notification.sender_id,
          status: 'joined',
        },
      });

      // Lobi oyuncu sayısını güncelle
      await this.prisma.matchLobby.update({
        where: { id: notification.related_id },
        data: {
          current_players: { increment: 1 },
          status: lobby.current_players + 1 >= lobby.max_players ? 'full' : 'open',
        },
      });

      // Arkadaşlık kontrolü ve oluşturma
      const existingFriendship = await this.prisma.friend.findFirst({
        where: {
          OR: [
            { user1_id: notification.sender_id, user2_id: notification.receiver_id },
            { user1_id: notification.receiver_id, user2_id: notification.sender_id },
          ],
        },
      });

      if (!existingFriendship) {
        // Arkadaşlık oluştur
        await this.prisma.friend.create({
          data: {
            user1_id: notification.receiver_id, // Maç sahibi
            user2_id: notification.sender_id,   // Katılan kişi
          },
        });

        console.log('🤝 Otomatik arkadaşlık oluşturuldu');
      }

      // Conversation oluştur veya bul
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          OR: [
            { user1_id: notification.sender_id, user2_id: notification.receiver_id },
            { user1_id: notification.receiver_id, user2_id: notification.sender_id },
          ],
        },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            user1_id: notification.receiver_id, // Maç sahibi
            user2_id: notification.sender_id,   // Katılan kişi
          },
        });

        console.log('💬 Otomatik conversation oluşturuldu');
      }

      // Hoş geldin mesajı gönder
      await this.prisma.message.create({
        data: {
          conversation_id: conversation.id,
          sender_id: notification.receiver_id, // Maç sahibi mesajı gönderiyor
          receiver_id: notification.sender_id,
          content: `Merhaba! Maçıma katılım isteğinizi onayladım. Artık mesajlaşabiliriz! ⚽`,
          message_type: 'text',
        },
      });

      console.log('✅ Hoş geldin mesajı gönderildi');

      this.pushNotificationService
        .sendMatchJoinAcceptedNotification(notification.sender_id, lobby.title, notification.related_id)
        .catch((error) => console.error('❌ Push bildirim hatası:', error));

      return {
        message: 'Maça katılım isteği onaylandı',
        conversationId: conversation.id,
      };
    } else {
      this.pushNotificationService
        .sendMatchJoinRejectedNotification(notification.sender_id, lobby.title)
        .catch((error) => console.error('❌ Push bildirim hatası:', error));

      console.log('❌ Maça katılım isteği reddedildi');
      return { message: 'Maça katılım isteği reddedildi' };
    }
  }

  // Bildirimi okundu olarak işaretle
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Bildirim bulunamadı');
    }

    if (notification.receiver_id !== userId) {
      throw new BadRequestException('Bu bildirimi okuma yetkiniz yok');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return { success: true };
  }

  // Okunmamış bildirim sayısını getir
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        receiver_id: userId,
        is_read: false,
      },
    });

    return { unreadCount: count };
  }
}
