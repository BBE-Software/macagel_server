import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import { SearchUsersDto } from './dto/search-users.dto';

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService) {}

  // Kullanıcı arama
  async searchUsers(userId: string, searchUsersDto: SearchUsersDto) {
    const { query, page = '1', limit = '20' } = searchUsersDto;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    console.log('🔍 Search Users - UserId:', userId);
    console.log('🔍 Search Users - Query:', query);
    console.log('🔍 Search Users - Params:', { page, limit, pageNum, limitNum, skip });

    if (!query || query.trim().length < 2) {
      console.log('❌ Search Users - Query too short');
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // Kendisi hariç
          { is_active: true },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { surname: { contains: query, mode: 'insensitive' } },
              { nickname: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        surname: true,
        nickname: true,
        email: true,
        is_private: true,
      },
      skip,
      take: limitNum,
    });

    console.log('📊 Search Users - Found users count:', users.length);
    console.log('📊 Search Users - Users:', users);

    // Her kullanıcı için arkadaşlık durumunu kontrol et
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const friendshipStatus = await this.getFriendshipStatus(userId, user.id);
        return {
          ...user,
          friendshipStatus,
        };
      })
    );

    console.log('✅ Search Users - Final result:', usersWithStatus);
    return usersWithStatus;
  }

  // İki kullanıcı arasındaki arkadaşlık durumu
  async getFriendshipStatus(userId: string, targetUserId: string) {
    // Arkadaş mı kontrol et
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { user1_id: userId, user2_id: targetUserId },
          { user1_id: targetUserId, user2_id: userId },
        ],
      },
    });

    if (friendship) {
      return 'friends';
    }

    // Arkadaşlık isteği var mı kontrol et
    const sentRequest = await this.prisma.friendRequest.findFirst({
      where: {
        sender_id: userId,
        receiver_id: targetUserId,
        status: 'pending',
      },
    });

    if (sentRequest) {
      return 'request_sent';
    }

    const receivedRequest = await this.prisma.friendRequest.findFirst({
      where: {
        sender_id: targetUserId,
        receiver_id: userId,
        status: 'pending',
      },
    });

    if (receivedRequest) {
      return 'request_received';
    }

    return 'none';
  }

  // Arkadaşlık isteği gönder
  async sendFriendRequest(senderId: string, sendFriendRequestDto: SendFriendRequestDto) {
    const { receiverId, message } = sendFriendRequestDto;

    // Kendine istek göndermeye çalışıyor mu?
    if (senderId === receiverId) {
      throw new BadRequestException('Kendine arkadaşlık isteği gönderemezsin');
    }

    // Alıcı kullanıcı var mı?
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Zaten arkadaş mı?
    const existingFriendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { user1_id: senderId, user2_id: receiverId },
          { user1_id: receiverId, user2_id: senderId },
        ],
      },
    });

    if (existingFriendship) {
      throw new ConflictException('Zaten arkadaşsınız');
    }

    // Bekleyen istek var mı?
    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { sender_id: senderId, receiver_id: receiverId, status: 'pending' },
          { sender_id: receiverId, receiver_id: senderId, status: 'pending' },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.sender_id === senderId) {
        throw new ConflictException('Zaten bekleyen arkadaşlık isteğiniz var');
      } else {
        throw new ConflictException('Bu kullanıcının size bekleyen arkadaşlık isteği var');
      }
    }

    // Arkadaşlık isteği oluştur
    const friendRequest = await this.prisma.friendRequest.create({
      data: {
        sender_id: senderId,
        receiver_id: receiverId,
        message,
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

    return friendRequest;
  }

  // Arkadaşlık isteğine yanıt ver
  async respondToFriendRequest(
    userId: string,
    requestId: string,
    respondFriendRequestDto: RespondFriendRequestDto,
  ) {
    const { status } = respondFriendRequestDto;

    // Arkadaşlık isteğini bul
    const friendRequest = await this.prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiver_id: userId,
        status: 'pending',
      },
    });

    if (!friendRequest) {
      throw new NotFoundException('Arkadaşlık isteği bulunamadı');
    }

    // İsteği güncelle
    const updatedRequest = await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status },
    });

    // Eğer kabul edildiyse arkadaşlık oluştur
    if (status === 'accepted') {
      await this.prisma.friend.create({
        data: {
          user1_id: friendRequest.sender_id,
          user2_id: friendRequest.receiver_id,
        },
      });
    }

    return updatedRequest;
  }

  // Gelen arkadaşlık istekleri
  async getReceivedFriendRequests(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        receiver_id: userId,
        status: 'pending',
      },
      include: {
        sender: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return requests.map((request) => ({
      id: request.id,
      senderId: request.sender_id,
      senderName: `${request.sender.name} ${request.sender.surname}`,
      senderNickname: request.sender.nickname,
      message: request.message,
      createdAt: request.created_at,
    }));
  }

  // Gönderilen arkadaşlık istekleri
  async getSentFriendRequests(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        sender_id: userId,
        status: 'pending',
      },
      include: {
        receiver: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return requests.map((request) => ({
      id: request.id,
      receiverId: request.receiver_id,
      receiverName: `${request.receiver.name} ${request.receiver.surname}`,
      receiverNickname: request.receiver.nickname,
      message: request.message,
      createdAt: request.created_at,
    }));
  }

  // Arkadaş listesi
  async getFriends(userId: string) {
    const friendships = await this.prisma.friend.findMany({
      where: {
        OR: [{ user1_id: userId }, { user2_id: userId }],
      },
      include: {
        user1: {
          select: { id: true, name: true, surname: true, nickname: true, is_active: true },
        },
        user2: {
          select: { id: true, name: true, surname: true, nickname: true, is_active: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return friendships.map((friendship) => {
      const friend = friendship.user1_id === userId ? friendship.user2 : friendship.user1;
      return {
        id: friend.id,
        name: `${friend.name} ${friend.surname}`,
        nickname: friend.nickname,
        isActive: friend.is_active,
        friendsSince: friendship.created_at,
      };
    });
  }

  // Arkadaşlığı sonlandır
  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { user1_id: userId, user2_id: friendId },
          { user1_id: friendId, user2_id: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Arkadaşlık bulunamadı');
    }

    await this.prisma.friend.delete({
      where: { id: friendship.id },
    });

    return { success: true, message: 'Arkadaşlık sonlandırıldı' };
  }

  // Arkadaşlık isteğini iptal et
  async cancelFriendRequest(userId: string, requestId: string) {
    const friendRequest = await this.prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        sender_id: userId,
        status: 'pending',
      },
    });

    if (!friendRequest) {
      throw new NotFoundException('Arkadaşlık isteği bulunamadı');
    }

    await this.prisma.friendRequest.delete({
      where: { id: requestId },
    });

    return { success: true, message: 'Arkadaşlık isteği iptal edildi' };
  }
}