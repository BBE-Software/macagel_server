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
import { JwtService } from '@nestjs/jwt';

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

  constructor(
    private messagesService: MessagesService,
    private jwtService: JwtService,
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

      // JWT token'ı verify et
      try {
        console.log('🔐 JWT token doğrulanıyor...');
        const payload = await this.jwtService.verifyAsync(token, {
          secret: 'temp-secret', // JWT strategy ile aynı secret
        });
        
        console.log('✅ JWT payload:', JSON.stringify(payload, null, 2));
        
        const userId = payload.sub || payload.id;
        if (!userId) {
          console.log('❌ WebSocket: Token içinde kullanıcı ID bulunamadı');
          console.log('🔍 Payload:', payload);
          client.disconnect();
          return;
        }

        console.log('👤 User ID bulundu:', userId);

        // Kullanıcı bilgilerini socket'e ekle
        client.user = {
          id: userId,
          email: payload.email,
          name: payload.name,
          surname: payload.surname,
        };

        // Kullanıcıyı bağlı kullanıcılar listesine ekle
        this.connectedUsers.set(userId, client.id);
        client.join(`user:${userId}`);
        
        console.log(`✅ WebSocket: User ${userId} connected with socket ${client.id}`);
        
        // Kullanıcıya bağlantı başarılı mesajı gönder
        client.emit('connected', {
          message: 'WebSocket bağlantısı başarılı',
          userId: userId,
        });
      } catch (jwtError) {
        console.log('❌ WebSocket: JWT doğrulama hatası:', jwtError.message);
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
        this.server.to(receiverSocketId).emit('new-message', message);
      }

      // Her iki kullanıcının konuşma listesini güncelle
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