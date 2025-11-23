import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { EnqueueMessageDto } from './dto/enqueue-message.dto';
import { encryptMessageContent, decryptMessageContent } from '../../utils/crypto.util';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async createMessage(senderId: string, createMessageDto: CreateMessageDto) {
    const { receiverId, content, messageType } = createMessageDto;
    
    console.log('💬 CreateMessage başladı:', { senderId, receiverId, messageType });

    // Check if users exist
    const [sender, receiver] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: senderId } }),
      this.prisma.user.findUnique({ where: { id: receiverId } }),
    ]);

    console.log('👥 Kullanıcılar kontrol edildi:', { 
      senderExists: !!sender, 
      receiverExists: !!receiver 
    });

    if (!sender || !receiver) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Check if users are friends
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { user1_id: senderId, user2_id: receiverId },
          { user1_id: receiverId, user2_id: senderId },
        ],
      },
    });

    console.log('🤝 Arkadaşlık kontrol edildi:', { friendship: !!friendship });

    if (!friendship) {
      console.log('❌ Arkadaş değiller, mesaj gönderilemiyor');
      throw new ForbiddenException('Sadece arkadaşlarınızla mesajlaşabilirsiniz');
    }

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { user1_id: senderId, user2_id: receiverId },
          { user1_id: receiverId, user2_id: senderId },
        ],
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          user1_id: senderId,
          user2_id: receiverId,
        },
      });
    }

    // Create message
    console.log('📝 Mesaj oluşturuluyor:', {
      conversation_id: conversation.id,
      sender_id: senderId,
      receiver_id: receiverId,
      message_type: messageType || 'text',
    });

    // İçeriği şifrele
    let encryptedContent: string;
    try {
      encryptedContent = encryptMessageContent(content);
    } catch (e) {
      console.error('❌ Mesaj içeriği şifrelenemedi:', e);
      throw new InternalServerErrorException('Mesaj şifreleme hatası');
    }

    const message = await this.prisma.message.create({
      data: {
        conversation_id: conversation.id,
        sender_id: senderId,
        receiver_id: receiverId,
        content: encryptedContent,
        message_type: messageType || 'text',
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

    console.log('✅ Mesaj başarıyla oluşturuldu:', message.id);
    // İstemci uyumluluğu için içerik çözülerek döndürülür
    let decrypted: string;
    try {
      decrypted = decryptMessageContent(message.content);
    } catch (e) {
      console.error('❌ Mesaj içeriği çözülemedi, orijinal içerik döndürülüyor:', e);
      // Eski düz metin mesajlar için orijinal içeriği koru
      decrypted = message.content;
    }
    return {
      ...message,
      content: decrypted,
    };
  }

  async getConversations(userId: string) {
    // Sadece arkadaşlarla olan konuşmaları getir
    const friendIds = await this.prisma.friend.findMany({
      where: {
        OR: [{ user1_id: userId }, { user2_id: userId }],
      },
      select: {
        user1_id: true,
        user2_id: true,
      },
    });

    const friendUserIds = friendIds.map(friend => 
      friend.user1_id === userId ? friend.user2_id : friend.user1_id
    );

    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { user1_id: userId, user2_id: { in: friendUserIds } },
          { user2_id: userId, user1_id: { in: friendUserIds } },
        ],
      },
      include: {
        user1: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
        user2: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, surname: true, nickname: true },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                receiver_id: userId,
                is_read: false,
              },
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return conversations.map((conv) => {
      const otherUser = conv.user1_id === userId ? conv.user2 : conv.user1;
      const lastMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        participantId: otherUser.id,
        participantName: `${otherUser.name} ${otherUser.surname}`,
        participantNickname: otherUser.nickname,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              senderId: lastMessage.sender_id,
              senderName: `${lastMessage.sender.name} ${lastMessage.sender.surname}`,
              content: (() => {
                try { return decryptMessageContent(lastMessage.content); } catch { return lastMessage.content; }
              })(),
              timestamp: lastMessage.created_at,
              type: lastMessage.message_type,
              isRead: lastMessage.is_read,
            }
          : null,
        unreadCount: conv._count.messages,
        lastActivity: conv.updated_at,
      };
    });
  }

  async getMessages(
    userId: string,
    conversationId: string,
    getMessagesDto: GetMessagesDto,
  ) {
    const { page = '1', limit = '50' } = getMessagesDto;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Check if user is part of this conversation, create if not exists
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user1_id: userId }, { user2_id: userId }],
      },
    });

    if (!conversation) {
      console.log('🔍 Conversation bulunamadı, otomatik oluşturuluyor...');
      console.log('📍 Conversation ID:', conversationId);
      console.log('👤 User ID:', userId);
      
      // Conversation ID'den participant ID'sini çıkarmaya çalış
      // Flutter'da format: deterministik hash from "user1-user2"
      // Diğer kullanıcıyı bulmak için friends tablosuna bak
      const friendships = await this.prisma.friend.findMany({
        where: {
          OR: [
            { user1_id: userId },
            { user2_id: userId }
          ]
        }
      });
      
      console.log('👥 Bulunan arkadaşlıklar:', friendships.length);
      
      if (friendships.length > 0) {
        // İlk arkadaşı ile conversation oluştur (demo için)
        const friendship = friendships[0];
        const otherUserId = friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id;
        
        console.log('🤝 Conversation oluşturuluyor:', { userId, otherUserId });
        
        // Conversation oluştur
        conversation = await this.prisma.conversation.create({
          data: {
            id: conversationId,
            user1_id: userId,
            user2_id: otherUserId,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        
        console.log('✅ Conversation oluşturuldu:', conversation.id);
      } else {
        console.log('❌ Arkadaşlık bulunamadı');
        throw new ForbiddenException('Bu konuşmaya erişim yetkiniz yok');
      }
    }

    const messages = await this.prisma.message.findMany({
      where: { conversation_id: conversationId },
      include: {
        sender: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limitNum,
    });

    return messages.map((msg) => ({
      id: msg.id,
      senderId: msg.sender_id,
      senderName: `${msg.sender.name} ${msg.sender.surname}`,
      receiverId: msg.receiver_id,
      content: (() => { try { return decryptMessageContent(msg.content); } catch { return msg.content; } })(),
      timestamp: msg.created_at,
      type: msg.message_type,
      isRead: msg.is_read,
    }));
  }

  async markMessagesAsRead(userId: string, conversationId: string) {
    // Check if user is part of this conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user1_id: userId }, { user2_id: userId }],
      },
    });

    if (!conversation) {
      throw new ForbiddenException('Bu konuşmaya erişim yetkiniz yok');
    }

    await this.prisma.message.updateMany({
      where: {
        conversation_id: conversationId,
        receiver_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });

    return { success: true };
  }

  async deleteConversation(userId: string, conversationId: string) {
    // Check if user is part of this conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user1_id: userId }, { user2_id: userId }],
      },
    });

    if (!conversation) {
      throw new ForbiddenException('Bu konuşmaya erişim yetkiniz yok');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }

  /**
   * Enqueue encrypted message envelopes for X3DH first messages
   * Server never parses ciphertext - just stores opaque blobs
   */
  async enqueueMessage(senderId: string, enqueueDto: EnqueueMessageDto) {
    console.log('📬 Enqueuing message from:', senderId);
    console.log('   📌 Step 1 - Conversation ID:', enqueueDto.conversationId);
    console.log('   📌 Step 2 - Recipient User ID:', enqueueDto.recipientUserId);
    console.log('   📌 Step 3 - Fanout count:', enqueueDto.fanout.length);

    // Resolve recipient ID: prefer provided UUID, else resolve by nickname
    let recipientUserId = enqueueDto.recipientUserId;
    if (!recipientUserId && enqueueDto.recipientNickname) {
      const u = await this.prisma.user.findUnique({
        where: { nickname: enqueueDto.recipientNickname },
        select: { id: true },
      });
      if (!u) {
        throw new NotFoundException('Invalid recipientNickname: user not found');
      }
      recipientUserId = u.id;
    }
    if (!recipientUserId) {
      throw new BadRequestException('recipientUserId or recipientNickname is required');
    }

    // Find or create conversation if not supplied
    let conversationId = enqueueDto.conversationId;
    if (!conversationId) {
      console.log('   📌 Step 0 - No conversationId, resolving 1:1 thread...');
      // Try to find existing 1:1 conversation between sender and recipient
      const existing = await this.prisma.conversation.findFirst({
        where: {
          OR: [
            { user1_id: senderId, user2_id: recipientUserId },
            { user1_id: recipientUserId, user2_id: senderId },
          ],
        },
        select: { id: true },
      });
      if (existing) {
        conversationId = existing.id;
      } else {
        const conv = await this.prisma.conversation.create({
          data: { user1_id: senderId, user2_id: recipientUserId },
          select: { id: true },
        });
        conversationId = conv.id;
        console.log('   🆕 Created new conversation:', conversationId);
      }
    } else {
      // Validate provided conversation exists
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true },
      });
      if (!conversation) {
        throw new BadRequestException('Invalid conversationId: conversation not found');
      }
    }

    // Validate recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientUserId },
    });

    if (!recipient) {
      throw new NotFoundException('Invalid recipientUserId: user not found');
    }

    // Validate each envelope
    const MAX_CIPHERTEXT_SIZE = 65536; // 64 KB
    for (const envelope of enqueueDto.fanout) {
      // Validate ciphertext size
      const ciphertextBytes = Buffer.from(envelope.ciphertext, 'base64').length;
      if (ciphertextBytes > MAX_CIPHERTEXT_SIZE) {
        throw new BadRequestException(
          `Ciphertext exceeds 64KB limit for device ${envelope.recipientDeviceId}`,
        );
      }

      // Validate header version
      if (envelope.header.v !== 1) {
        throw new BadRequestException('Invalid header version (must be 1)');
      }

      // Validate device exists
      const device = await this.prisma.device.findFirst({
        where: {
          device_id: envelope.recipientDeviceId,
          user_id: recipientUserId,
        },
      });

      if (!device) {
        throw new NotFoundException(
          `Invalid recipientDeviceId: ${envelope.recipientDeviceId} not found for recipient`,
        );
      }
    }

    // Insert envelopes (one per device)
    const inserted = await Promise.all(
      enqueueDto.fanout.map(async (envelope) => {
        // Get device UUID
        const device = await this.prisma.device.findFirst({
          where: {
            device_id: envelope.recipientDeviceId,
            user_id: recipientUserId,
          },
        });

        return this.prisma.messageEnvelope.create({
          data: {
            conversation_id: conversationId!,
            sender_user_id: senderId,
            recipient_user_id: recipientUserId!,
            recipient_device_id: device!.id,
            header_json: envelope.header as any,
            ciphertext_b64: envelope.ciphertext,
            status: 'pending',
          },
        });
      }),
    );

    console.log('✅ Enqueued', inserted.length, 'envelope(s)');

    return {
      accepted: true,
      enqueued: inserted.length,
    };
  }
}