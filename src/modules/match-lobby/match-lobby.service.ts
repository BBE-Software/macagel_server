import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMatchLobbyDto } from './dto/create-match-lobby.dto';
import { JoinLobbyDto } from './dto/join-lobby.dto';
import moment from 'moment-timezone';

@Injectable()
export class MatchLobbyService {
  constructor(private prisma: PrismaService) {}

  // Türkiye saatini al
  private getTurkeyTime(): Date {
    return moment().tz('Europe/Istanbul').toDate();
  }

  // Her 5 dakikada bir süresi geçen maçları temizle
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCleanupExpiredMatches() {
    console.log('⏰ Scheduled cleanup başlatılıyor...');
    await this.cleanupExpiredMatches();
  }

  // Maçları otomatik olarak temizle (süresi geçen maçları işaretle)
  async cleanupExpiredMatches() {
    console.log('🧹 Süresi geçen maçlar işaretleniyor...');
    
    const now = this.getTurkeyTime(); // Türkiye saati kullan
    console.log('🕐 Şu anki Türkiye saati:', now);
    
    try {
      // Tüm açık maçları getir
      const allOpenMatches = await this.prisma.matchLobby.findMany({
        where: {
          status: {
            in: ['open', 'full'], // Sadece açık ve dolu maçları kontrol et
          },
          time_over: false, // Sadece henüz süresi geçmemiş olanları kontrol et
        },
        select: {
          id: true,
          title: true,
          date: true,
          duration: true,
        },
      });

      console.log(`📊 Toplam ${allOpenMatches.length} açık maç bulundu`);

      let markedCount = 0;
      
      // Her maç için süre kontrolü yap
      for (const match of allOpenMatches) {
        // Veritabanındaki tarihi doğrudan kullan (timezone dönüşümü yapma)
        const matchDate = new Date(match.date);
        const matchEndTime = new Date(matchDate.getTime() + (match.duration * 60 * 1000)); // dakika -> milisaniye
        
        console.log(`🔍 Maç kontrolü: ${match.title}`);
        console.log(`   Veritabanındaki tarih: ${match.date}`);
        console.log(`   Maç tarihi (parsed): ${matchDate.toISOString()}`);
        console.log(`   Maç süresi: ${match.duration} dakika`);
        console.log(`   Bitiş zamanı: ${matchEndTime.toISOString()}`);
        console.log(`   Şu an: ${now.toISOString()}`);
        console.log(`   Süresi geçti mi: ${now > matchEndTime}`);
        
        if (now > matchEndTime) {
          console.log(`⏰ Maç süresi geçti işaretleniyor: ${match.title} (${matchDate.toISOString()})`);
          
          // Maçı time_over = true olarak işaretle (silme)
          await this.prisma.matchLobby.update({
            where: { id: match.id },
            data: { time_over: true },
          });
          
          console.log(`✅ Maç süresi geçti işaretlendi: ${match.title}`);
          markedCount++;
        }
      }
      
      console.log(`✅ Maç temizleme işlemi tamamlandı. ${markedCount} maç işaretlendi.`);
    } catch (error) {
      console.error('❌ Maç temizleme hatası:', error);
    }
  }

  // Maç lobisi oluştur
  async createLobby(userId: string, createLobbyDto: CreateMatchLobbyDto) {
    console.log('🏆 Yeni maç lobisi oluşturuluyor...', createLobbyDto);

    // Gelen UTC tarihi Türkiye saatine çevir
    console.log('📥 Gelen tarih (raw):', createLobbyDto.date);
    
    // Gelen tarihi parse et (UTC olarak geliyor)
    const utcDate = new Date(createLobbyDto.date);
    console.log('📥 Gelen tarih (UTC):', utcDate.toISOString());
    
    // UTC'yi Türkiye saatine çevir (+3 saat)
    const turkeyDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
    console.log('🇹🇷 Türkiye saati: ${turkeyDate.toISOString()}');

    const lobby = await this.prisma.matchLobby.create({
      data: {
        title: createLobbyDto.title,
        description: createLobbyDto.description,
        location: createLobbyDto.location,
        latitude: createLobbyDto.latitude,
        longitude: createLobbyDto.longitude,
        venue_id: createLobbyDto.venue_id, // YENİ: Halısaha ID'si
        date: turkeyDate, // Türkiye saati olarak kaydet
        duration: createLobbyDto.duration || 90,
        max_players: createLobbyDto.max_players || 22,
        price_per_person: createLobbyDto.price_per_person,
        is_private: createLobbyDto.is_private || false,
        is_reward_match: createLobbyDto.is_reward_match || false,
        reward_description: createLobbyDto.reward_description,
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
      time_over: false, // Sadece süresi geçmemiş maçları getir
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

  // Maç lobisini güncelle (sadece oluşturan kişi)
  async updateLobby(lobbyId: string, userId: string, updateLobbyDto: CreateMatchLobbyDto) {
    console.log('✏️ Lobi güncelleme isteği...', { lobbyId, userId });

    // Lobi kontrolü
    const lobby = await this.prisma.matchLobby.findUnique({
      where: { id: lobbyId },
      include: { participants: true },
    });

    if (!lobby) {
      throw new NotFoundException('Maç lobisi bulunamadı');
    }

    // Sadece oluşturan kişi güncelleyebilir
    if (lobby.creator_id !== userId) {
      throw new ForbiddenException('Bu lobiyi güncelleme yetkiniz yok. Sadece lobi sahibi güncelleyebilir.');
    }

    // Lobi durumu kontrolü - başlamış veya bitmiş maçlar güncellenemez
    if (lobby.status === 'started' || lobby.status === 'finished') {
      throw new BadRequestException('Başlamış veya bitmiş lobiler güncellenemez');
    }

    // Max oyuncu sayısı mevcut oyuncu sayısından az olamaz
    if (updateLobbyDto.max_players && updateLobbyDto.max_players < lobby.current_players) {
      throw new BadRequestException('Maksimum oyuncu sayısı mevcut katılımcı sayısından az olamaz');
    }

    // Lobi güncelle
    const updatedLobby = await this.prisma.matchLobby.update({
      where: { id: lobbyId },
      data: {
        title: updateLobbyDto.title,
        description: updateLobbyDto.description,
        location: updateLobbyDto.location,
        latitude: updateLobbyDto.latitude,
        longitude: updateLobbyDto.longitude,
        date: new Date(updateLobbyDto.date),
        duration: updateLobbyDto.duration || lobby.duration,
        max_players: updateLobbyDto.max_players || lobby.max_players,
        price_per_person: updateLobbyDto.price_per_person,
        is_private: updateLobbyDto.is_private ?? lobby.is_private,
        // Status'u kontrol et
        status: (updateLobbyDto.max_players && updateLobbyDto.max_players <= lobby.current_players) 
          ? 'full' 
          : 'open',
      },
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
      },
    });

    console.log('✅ Lobi başarıyla güncellendi');
    return updatedLobby;
  }

  // Katılımcıyı at (sadece oluşturan kişi)
  async kickParticipant(lobbyId: string, userId: string, participantId: string) {
    console.log('👢 Katılımcı atma isteği...', { lobbyId, userId, participantId });

    // Lobi kontrolü
    const lobby = await this.prisma.matchLobby.findUnique({
      where: { id: lobbyId },
      include: { participants: true },
    });

    if (!lobby) {
      throw new NotFoundException('Maç lobisi bulunamadı');
    }

    // Sadece oluşturan kişi atabilir
    if (lobby.creator_id !== userId) {
      throw new ForbiddenException('Katılımcı atma yetkiniz yok. Sadece lobi sahibi atabilir.');
    }

    // Lobi sahibi kendini atamaz
    if (participantId === userId) {
      throw new BadRequestException('Lobi sahibi kendini maçtan atamaz');
    }

    // Katılımcı kontrolü
    const participation = await this.prisma.matchParticipant.findFirst({
      where: {
        lobby_id: lobbyId,
        user_id: participantId,
        status: 'joined',
      },
    });

    if (!participation) {
      throw new NotFoundException('Bu kullanıcı bu lobiye katılmamış');
    }

    // Katılımcıyı at
    await this.prisma.matchParticipant.update({
      where: { id: participation.id },
      data: { status: 'kicked' },
    });

    // Lobi oyuncu sayısını güncelle
    await this.prisma.matchLobby.update({
      where: { id: lobbyId },
      data: {
        current_players: { decrement: 1 },
        status: 'open', // Birini attığımızda tekrar açık olur
      },
    });

    console.log('✅ Katılımcı başarıyla atıldı');
    return { message: 'Katılımcı başarıyla atıldı' };
  }

  // Maç lobisini sil (sadece oluşturan kişi)
  async deleteLobby(lobbyId: string, userId: string) {
    console.log('🗑️ Lobi silme isteği...', { lobbyId, userId });

    // Lobi kontrolü
    const lobby = await this.prisma.matchLobby.findUnique({
      where: { id: lobbyId },
      include: { 
        participants: true,
        invitations: true,
      },
    });

    if (!lobby) {
      throw new NotFoundException('Maç lobisi bulunamadı');
    }

    // Sadece oluşturan kişi silebilir
    if (lobby.creator_id !== userId) {
      throw new ForbiddenException('Bu lobiyi silme yetkiniz yok. Sadece lobi sahibi silebilir.');
    }

    // Lobi durumu kontrolü - başlamış veya bitmiş maçlar silinemez
    if (lobby.status === 'started' || lobby.status === 'finished') {
      throw new BadRequestException('Başlamış veya bitmiş lobiler silinemez');
    }

    // İlgili tüm kayıtları sil (Prisma cascade işlemi yapacak)
    await this.prisma.matchLobby.delete({
      where: { id: lobbyId },
    });

    console.log('✅ Lobi başarıyla silindi');
    return { message: 'Lobi başarıyla silindi' };
  }

  // ======= YENİ: Katılım İsteği Sistemi =======

  /**
   * Maça katılım isteği oluştur
   */
  async createJoinRequest(
    lobbyId: string,
    userId: string,
    message?: string,
    venueId?: string,
  ) {
    console.log('📨 Katılım isteği oluşturuluyor...', { lobbyId, userId });

    // Lobi kontrolü
    const lobby = await this.prisma.matchLobby.findUnique({
      where: { id: lobbyId },
      include: { creator: true },
    });

    if (!lobby) {
      throw new NotFoundException('Maç lobisi bulunamadı');
    }

    // Maç sahibi kendi maçına istek atamaz
    if (lobby.creator_id === userId) {
      throw new BadRequestException('Kendi oluşturduğunuz maça katılım isteği gönderemezsiniz');
    }

    // Zaten katılmış mı kontrol et
    const alreadyJoined = await this.prisma.matchParticipant.findUnique({
      where: {
        lobby_id_user_id: {
          lobby_id: lobbyId,
          user_id: userId,
        },
      },
    });

    if (alreadyJoined) {
      throw new BadRequestException('Bu maça zaten katıldınız');
    }

    // Zaten bekleyen istek var mı kontrol et
    const existingRequest = await this.prisma.matchJoinRequest.findUnique({
      where: {
        lobby_id_user_id: {
          lobby_id: lobbyId,
          user_id: userId,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new BadRequestException('Bu maça zaten katılım isteğiniz bulunmaktadır');
      } else if (existingRequest.status === 'rejected') {
        // Reddedilmiş isteği güncelle
        const request = await this.prisma.matchJoinRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: 'pending',
            message,
            venue_id: venueId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname: true,
                nickname: true,
              },
            },
          },
        });

        console.log('✅ Katılım isteği yeniden gönderildi');
        return { message: 'Katılım isteği gönderildi', data: request };
      }
    }

    // Yeni istek oluştur
    const request = await this.prisma.matchJoinRequest.create({
      data: {
        lobby_id: lobbyId,
        user_id: userId,
        venue_id: venueId,
        message,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
          },
        },
      },
    });

    // TODO: Maç sahibine bildirim gönder
    // await this.notificationsService.create({...})

    console.log('✅ Katılım isteği oluşturuldu');
    return { message: 'Katılım isteği gönderildi', data: request };
  }

  /**
   * Maçın katılım isteklerini getir (sadece maç sahibi)
   */
  async getJoinRequests(lobbyId: string, userId: string) {
    console.log('📋 Katılım istekleri getiriliyor...', { lobbyId, userId });

    // Lobi kontrolü
    const lobby = await this.prisma.matchLobby.findUnique({
      where: { id: lobbyId },
    });

    if (!lobby) {
      throw new NotFoundException('Maç lobisi bulunamadı');
    }

    // Sadece maç sahibi görebilir
    if (lobby.creator_id !== userId) {
      throw new ForbiddenException('Bu istekleri görme yetkiniz yok');
    }

    const requests = await this.prisma.matchJoinRequest.findMany({
      where: {
        lobby_id: lobbyId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
            position: true,
            preferred_foot: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      success: true,
      count: requests.length,
      data: requests,
    };
  }

  /**
   * Katılım isteğini onayla
   */
  async acceptJoinRequest(requestId: string, userId: string) {
    console.log('✅ Katılım isteği onaylanıyor...', { requestId, userId });

    // İstek kontrolü
    const request = await this.prisma.matchJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        lobby: true,
        user: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Katılım isteği bulunamadı');
    }

    // Sadece maç sahibi onaylayabilir
    if (request.lobby.creator_id !== userId) {
      throw new ForbiddenException('Bu isteği onaylama yetkiniz yok');
    }

    // Maç dolu mu kontrol et
    if (request.lobby.current_players >= request.lobby.max_players) {
      throw new BadRequestException('Maç dolu');
    }

    // İsteği onayla
    await this.prisma.matchJoinRequest.update({
      where: { id: requestId },
      data: { status: 'accepted' },
    });

    // Kullanıcıyı maça ekle
    await this.prisma.matchParticipant.create({
      data: {
        lobby_id: request.lobby_id,
        user_id: request.user_id,
      },
    });

    // Lobi oyuncu sayısını güncelle
    const updatedLobby = await this.prisma.matchLobby.update({
      where: { id: request.lobby_id },
      data: {
        current_players: { increment: 1 },
      },
    });

    // Maç doldu mu kontrol et
    if (updatedLobby.current_players >= updatedLobby.max_players) {
      await this.prisma.matchLobby.update({
        where: { id: request.lobby_id },
        data: { status: 'full' },
      });
    }

    // TODO: Kullanıcıya bildirim gönder
    // await this.notificationsService.create({...})

    console.log('✅ Katılım isteği onaylandı');
    return { message: 'Katılım isteği onaylandı', data: request };
  }

  /**
   * Katılım isteğini reddet
   */
  async rejectJoinRequest(requestId: string, userId: string) {
    console.log('❌ Katılım isteği reddediliyor...', { requestId, userId });

    // İstek kontrolü
    const request = await this.prisma.matchJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        lobby: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Katılım isteği bulunamadı');
    }

    // Sadece maç sahibi reddedebilir
    if (request.lobby.creator_id !== userId) {
      throw new ForbiddenException('Bu isteği reddetme yetkiniz yok');
    }

    // İsteği reddet
    await this.prisma.matchJoinRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });

    // TODO: Kullanıcıya bildirim gönder
    // await this.notificationsService.create({...})

    console.log('✅ Katılım isteği reddedildi');
    return { message: 'Katılım isteği reddedildi' };
  }

  // ======= YENİ SON =======
}
