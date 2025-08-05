import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMatchLobbyDto } from './dto/create-match-lobby.dto';
import { JoinLobbyDto } from './dto/join-lobby.dto';

@Injectable()
export class MatchLobbyService {
  constructor(private prisma: PrismaService) {}

  // Maç lobisi oluştur
  async createLobby(userId: string, createLobbyDto: CreateMatchLobbyDto) {
    console.log('🏆 Yeni maç lobisi oluşturuluyor...', createLobbyDto);

    const lobby = await this.prisma.matchLobby.create({
      data: {
        title: createLobbyDto.title,
        description: createLobbyDto.description,
        location: createLobbyDto.location,
        latitude: createLobbyDto.latitude,
        longitude: createLobbyDto.longitude,
        date: new Date(createLobbyDto.date),
        duration: createLobbyDto.duration || 90,
        max_players: createLobbyDto.max_players || 22,
        price_per_person: createLobbyDto.price_per_person,
        is_private: createLobbyDto.is_private || false,
        creator_id: userId,
        current_players: 1, // Oluşturan kişi otomatik katılır
      },
      include: {
        creator: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, surname: true, nickname: true },
            },
          },
        },
      },
    });

    // Oluşturan kişiyi otomatik katılımcı yap
    await this.prisma.matchParticipant.create({
      data: {
        lobby_id: lobby.id,
        user_id: userId,
        status: 'joined',
      },
    });

    console.log('✅ Maç lobisi oluşturuldu:', lobby.id);
    return lobby;
  }

  // Tüm açık maç lobilerini getir
  async getLobbies(userId: string, filters?: { status?: string; location?: string }) {
    console.log('📋 Maç lobileri getiriliyor...');

    const where: any = {
      status: filters?.status || 'open',
    };

    if (filters?.location) {
      where.location = {
        contains: filters.location,
        mode: 'insensitive',
      };
    }

    const lobbies = await this.prisma.matchLobby.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, surname: true, nickname: true, position: true },
            },
          },
          where: { status: 'joined' },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    console.log('📊 Bulunan lobi sayısı:', lobbies.length);
    return lobbies;
  }

  // Belirli bir maç lobisini getir
  async getLobbyById(lobbyId: string, userId: string) {
    const lobby = await this.prisma.matchLobby.findUnique({
      where: { id: lobbyId },
      include: {
        creator: {
          select: { id: true, name: true, surname: true, nickname: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, surname: true, nickname: true, position: true },
            },
          },
          where: { status: 'joined' },
        },
        invitations: {
          include: {
            sender: {
              select: { id: true, name: true, surname: true, nickname: true },
            },
            receiver: {
              select: { id: true, name: true, surname: true, nickname: true },
            },
          },
          where: { status: 'pending' },
        },
      },
    });

    if (!lobby) {
      throw new NotFoundException('Maç lobisi bulunamadı');
    }

    return lobby;
  }

  // Maç lobisine katıl
  async joinLobby(lobbyId: string, userId: string, joinLobbyDto: JoinLobbyDto) {
    console.log('🤝 Lobiye katılım isteği...', { lobbyId, userId });

    // Lobi kontrolü
    const lobby = await this.prisma.matchLobby.findUnique({
      where: { id: lobbyId },
      include: { participants: true },
    });

    if (!lobby) {
      throw new NotFoundException('Maç lobisi bulunamadı');
    }

    if (lobby.status !== 'open') {
      throw new BadRequestException('Bu lobi katılıma kapalı');
    }

    if (lobby.current_players >= lobby.max_players) {
      throw new BadRequestException('Lobi dolu');
    }

    // Zaten katılım kontrolü
    const existingParticipation = await this.prisma.matchParticipant.findFirst({
      where: {
        lobby_id: lobbyId,
        user_id: userId,
        status: 'joined',
      },
    });

    if (existingParticipation) {
      throw new BadRequestException('Zaten bu lobiye katıldınız');
    }

    // Katılım oluştur
    await this.prisma.matchParticipant.create({
      data: {
        lobby_id: lobbyId,
        user_id: userId,
        status: 'joined',
        position: joinLobbyDto.position,
      },
    });

    // Lobi oyuncu sayısını güncelle
    await this.prisma.matchLobby.update({
      where: { id: lobbyId },
      data: {
        current_players: { increment: 1 },
        status: lobby.current_players + 1 >= lobby.max_players ? 'full' : 'open',
      },
    });

    console.log('✅ Lobiye katılım başarılı');
    return { message: 'Lobiye başarıyla katıldınız' };
  }

  // Maç lobisinden ayrıl
  async leaveLobby(lobbyId: string, userId: string) {
    console.log('👋 Lobiden ayrılma isteği...', { lobbyId, userId });

    const participation = await this.prisma.matchParticipant.findFirst({
      where: {
        lobby_id: lobbyId,
        user_id: userId,
        status: 'joined',
      },
    });

    if (!participation) {
      throw new NotFoundException('Bu lobiye katılmamışsınız');
    }

    // Katılımı güncelle
    await this.prisma.matchParticipant.update({
      where: { id: participation.id },
      data: { status: 'left' },
    });

    // Lobi oyuncu sayısını güncelle
    await this.prisma.matchLobby.update({
      where: { id: lobbyId },
      data: {
        current_players: { decrement: 1 },
        status: 'open', // Dolu ise tekrar açık yap
      },
    });

    console.log('✅ Lobiden ayrılma başarılı');
    return { message: 'Lobiden başarıyla ayrıldınız' };
  }

  // Kullanıcının katıldığı maçları getir
  async getUserLobbies(userId: string) {
    const participations = await this.prisma.matchParticipant.findMany({
      where: {
        user_id: userId,
        status: 'joined',
      },
      include: {
        lobby: {
          include: {
            creator: {
              select: { id: true, name: true, surname: true, nickname: true },
            },
            _count: {
              select: { participants: true },
            },
          },
        },
      },
      orderBy: { lobby: { date: 'asc' } },
    });

    return participations.map(p => p.lobby);
  }
}
