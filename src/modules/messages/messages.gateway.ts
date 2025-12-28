import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { createClient } from '@supabase/supabase-js';
import { NotificationsService } from '../notifications/notifications.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    name: string;
    surname: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['polling', 'websocket'], // Polling support ekle
  allowEIO3: true, // Socket.IO v3 uyumluluğu
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(
    private messagesService: MessagesService,
    private notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    console.log('🔌 Yeni WebSocket bağlantı isteği geldi');
    console.log('📍 Socket ID:', client.id);
    console.log('🔍 Handshake Auth:', client.handshake.auth);
    console.log('🔍 Handshake Query:', client.handshake.query);
    
    try {
      // JWT token'ı auth header'dan al
      const token = client.handshake.auth.token;
      
      if (!token) {
        console.log('❌ WebSocket: Token bulunamadı');
        client.disconnect();
        return;
      }

      console.log('🔑 Token alındı, uzunluk:', token.length);

      // JWT token'ı Supabase API ile verify et (HTTP guard ile aynı yöntem)
      try {
        console.log('🔐 Supabase ile JWT token doğrulanıyor...');
        const { data: { user }, error } = await this.supabase.auth.getUser(token);
        
        if (error || !user) {
          console.log('❌ WebSocket: Supabase token doğrulama hatası:', error?.message);
          client.disconnect();
          return;
        }

        console.log('✅ WebSocket: Supabase token doğrulandı');
        console.log('👤 User ID bulundu:', user.id);

        // Kullanıcı bilgilerini socket'e ekle
        client.user = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || '',
          surname: user.user_metadata?.surname || '',
        };

        // Kullanıcıyı bağlı kullanıcılar listesine ekle
        this.connectedUsers.set(user.id, client.id);
        client.join(`user:${user.id}`);
        
        console.log(`✅ WebSocket: User ${user.id} connected with socket ${client.id}`);
        
        // Kullanıcıya bağlantı başarılı mesajı gönder
        client.emit('connected', {
          message: 'WebSocket bağlantısı başarılı',
          userId: user.id,
        });
      } catch (authError) {
        console.log('❌ WebSocket: Token doğrulama hatası:', authError.message);
        client.disconnect();
        return;
      }
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // Kullanıcıyı connected users listesinden çıkar
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  }

  @SubscribeMessage('send-message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: CreateMessageDto,
  ) {
    console.log('🔥 WebSocket send-message event alındı:', data);
    
    try {
      // Kullanıcı bilgilerini socket'ten al
      if (!client.user?.id) {
        console.log('❌ WebSocket: Kullanıcı kimliği doğrulanmamış');
        client.emit('message-error', {
          error: 'Kimlik doğrulama hatası',
        });
        return;
      }

      const senderId = client.user.id;
      const { receiverId, content, messageType } = data;

      console.log('📤 Mesaj gönderme işlemi başlatılıyor...', {
        senderId,
        receiverId,
        messageType
      });

      // Mesajı veritabanına kaydet
      const message = await this.messagesService.createMessage(senderId, {
        receiverId,
        content,
        messageType,
      });

      console.log('✅ Mesaj service tarafından döndürüldü:', message.id);

      // Gönderene mesaj gönderildi confirmation'ı gönder
      client.emit('message-sent', {
        success: true,
        message: message,
      });

      // Alıcıya mesajı gönder (eğer online ise)
      const receiverSocketId = this.connectedUsers.get(receiverId);
      if (receiverSocketId) {
        console.log('📤 Alıcıya mesaj gönderiliyor:', receiverId);
        this.server.to(receiverSocketId).emit('new-message', message);
      } else {
        console.log('⚠️ Alıcı online değil:', receiverId);
      }

      // Gönderene de mesajı gönder (kendi mesajını görmesi için)
      console.log('📤 Gönderene mesaj gönderiliyor:', senderId);
      this.server.to(`user:${senderId}`).emit('new-message', message);

      // Her iki kullanıcının konuşma listesini güncelle
      console.log('🔄 Konuşma listeleri güncelleniyor...');
      this.server.to(`user:${senderId}`).emit('conversation-updated');
      this.server.to(`user:${receiverId}`).emit('conversation-updated');

    } catch (error) {
      console.error('❌ WebSocket Send message error:', error);
      client.emit('message-error', {
        error: 'Mesaj gönderilirken hata oluştu: ' + error.message,
      });
    }
  }

  @SubscribeMessage('join-conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      // Kullanıcı bilgilerini socket'ten al
      if (!client.user?.id) {
        console.log('❌ WebSocket: Kullanıcı kimliği doğrulanmamış');
        client.emit('join-error', {
          error: 'Kimlik doğrulama hatası',
        });
        return;
      }

      const { conversationId } = data;
      const userId = client.user.id;
      
      client.join(`conversation:${conversationId}`);
      
      // Mesajları okundu olarak işaretle
      await this.messagesService.markMessagesAsRead(userId, conversationId);
      
      client.emit('joined-conversation', {
        conversationId,
        message: 'Konuşmaya katıldınız',
      });

      // Karşı tarafa mesajların okunduğunu bildir
      this.server.to(`conversation:${conversationId}`).emit('messages-read', {
        conversationId,
        readBy: userId,
      });

      // Konuşma listelerini güncelle
      this.server.to(`user:${userId}`).emit('conversation-updated');

    } catch (error) {
      console.error('Join conversation error:', error);
      client.emit('join-error', {
        error: 'Konuşmaya katılırken hata oluştu',
      });
    }
  }

  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    client.leave(`conversation:${conversationId}`);
    
    client.emit('left-conversation', {
      conversationId,
      message: 'Konuşmadan ayrıldınız',
    });
  }

  @SubscribeMessage('typing-start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user?.id) {
      return;
    }

    const { conversationId } = data;
    const userId = client.user.id;
    const userName = `${client.user.name} ${client.user.surname}`;
    
    // Kullanıcının kendisi hariç konuşmadaki diğer kullanıcılara typing bildirimi gönder
    client.to(`conversation:${conversationId}`).emit('user-typing', {
      userId,
      userName,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user?.id) {
      return;
    }

    const { conversationId } = data;
    const userId = client.user.id;
    
    client.to(`conversation:${conversationId}`).emit('user-typing', {
      userId,
      isTyping: false,
    });
  }

  // Online kullanıcıları al
  @SubscribeMessage('get-online-users')
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    const onlineUserIds = Array.from(this.connectedUsers.keys());
    client.emit('online-users', onlineUserIds);
  }
}