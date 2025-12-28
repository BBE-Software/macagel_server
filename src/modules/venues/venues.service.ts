import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Yakındaki halısahaları getir
   */
  async getNearbyVenues(lat: number, lng: number, radiusKm: number = 5) {
    const latDelta = radiusKm / 111; // 1 derece ≈ 111 km
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const venues = await this.prisma.futsalVenue.findMany({
      where: {
        latitude: {
          gte: lat - latDelta,
          lte: lat + latDelta,
        },
        longitude: {
          gte: lng - lngDelta,
          lte: lng + lngDelta,
        },
        verified: true, // Sadece onaylı halısahalar
      },
      include: {
        _count: {
          select: {
            lobbies: {
              where: {
                date: {
                  gte: new Date(), // Gelecekteki maçlar
                },
                status: 'open',
              },
            },
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
    });

    // Mesafe hesapla ve ekle
    return venues.map((venue) => ({
      ...venue,
      activeMatchCount: venue._count.lobbies,
      distance: this.calculateDistance(lat, lng, venue.latitude, venue.longitude),
    }));
  }

  /**
   * Halısaha detayını getir
   */
  async getVenueById(id: string) {
    const venue = await this.prisma.futsalVenue.findUnique({
      where: { id },
      include: {
        added_by: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
          },
        },
      },
    });

    if (!venue) {
      throw new NotFoundException('Halısaha bulunamadı');
    }

    return venue;
  }

  /**
   * Bir halısahadaki aktif maçları getir
   */
  async getVenueMatches(venueId: string, date?: Date) {
    const venue = await this.prisma.futsalVenue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      throw new NotFoundException('Halısaha bulunamadı');
    }

    const matches = await this.prisma.matchLobby.findMany({
      where: {
        venue_id: venueId,
        date: date ? { gte: date } : { gte: new Date() },
        status: {
          in: ['open', 'full'],
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
          },
        },
        participants: {
          select: {
            user_id: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return {
      venue,
      matches: matches.map((match) => ({
        ...match,
        participantCount: match.participants.length,
      })),
    };
  }

  /**
   * Kullanıcı halısaha ekler
   */
  async createVenue(userId: string, data: CreateVenueDto) {
    return this.prisma.futsalVenue.create({
      data: {
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        fields: data.fields || 1,
        indoor: data.indoor || false,
        has_lighting: data.hasLighting !== false,
        has_parking: data.hasParking || false,
        has_locker_room: data.hasLockerRoom || false,
        price_per_hour: data.pricePerHour,
        added_by_user_id: userId,
        verified: false, // Admin onayı bekler
      },
    });
  }

  /**
   * OpenStreetMap'ten halısahaları çek ve database'e kaydet
   * (Sadece admin kullanabilir)
   */
  async seedVenuesFromOSM(lat: number, lng: number, radiusKm: number = 10) {
    console.log(`🗺️  OSM'den halısaha verisi çekiliyor...`);
    console.log(`📍 Konum: ${lat}, ${lng}`);
    console.log(`📏 Yarıçap: ${radiusKm} km`);

    const radiusMeters = radiusKm * 1000;

    // Overpass API sorgusu
    const query = `
      [out:json][timeout:25];
      (
        node["leisure"="pitch"]["sport"="soccer"](around:${radiusMeters},${lat},${lng});
        way["leisure"="pitch"]["sport"="soccer"](around:${radiusMeters},${lat},${lng});
        relation["leisure"="pitch"]["sport"="soccer"](around:${radiusMeters},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const response = await axios.post(
        'https://overpass-api.de/api/interpreter',
        query,
        {
          headers: {
            'Content-Type': 'text/plain',
          },
          timeout: 30000,
        },
      );

      const elements = response.data.elements;
      console.log(`✅ OSM'den ${elements.length} element bulundu`);

      let createdCount = 0;
      let updatedCount = 0;

      for (const element of elements) {
        if (element.type === 'node' && element.lat && element.lon) {
          const tags = element.tags || {};
          const name = tags.name || tags['name:tr'] || `Futbol Sahası ${element.id}`;

          // OSM ID ile kontrol et
          const existing = await this.prisma.futsalVenue.findUnique({
            where: { osm_id: element.id.toString() },
          });

          const venueData = {
            name,
            address: tags['addr:full'] || tags['addr:street'] || 'Adres bilgisi yok',
            latitude: element.lat,
            longitude: element.lon,
            phone: tags.phone || tags['contact:phone'],
            osm_id: element.id.toString(),
            indoor: tags.indoor === 'yes',
            has_lighting: tags.lit === 'yes' || tags.floodlit === 'yes',
            has_parking: tags.parking === 'yes',
            fields: parseInt(tags.capacity) || 1,
            verified: true, // OSM'den gelenler otomatik onaylı
          };

          if (existing) {
            await this.prisma.futsalVenue.update({
              where: { id: existing.id },
              data: venueData,
            });
            updatedCount++;
          } else {
            await this.prisma.futsalVenue.create({
              data: venueData,
            });
            createdCount++;
          }
        }
      }

      console.log(`✅ ${createdCount} yeni halısaha eklendi`);
      console.log(`🔄 ${updatedCount} halısaha güncellendi`);

      return {
        success: true,
        created: createdCount,
        updated: updatedCount,
        total: createdCount + updatedCount,
      };
    } catch (error) {
      console.error('❌ OSM API hatası:', error.message);
      throw new Error('Halısaha verisi çekilemedi: ' + error.message);
    }
  }

  /**
   * İki nokta arasındaki mesafeyi hesapla (Haversine formülü)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// DTO Interfaces
export interface CreateVenueDto {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  fields?: number;
  indoor?: boolean;
  hasLighting?: boolean;
  hasParking?: boolean;
  hasLockerRoom?: boolean;
  pricePerHour?: number;
}
