import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VenuesService } from './venues.service';
import type { CreateVenueDto } from './venues.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  /**
   * GET /venues/nearby?lat=41.0082&lng=28.9784&radius=5
   * Yakındaki halısahaları getir
   */
  @Get('nearby')
  async getNearbyVenues(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 5;

    if (isNaN(latitude) || isNaN(longitude)) {
      return {
        success: false,
        message: 'Geçersiz koordinatlar',
      };
    }

    const venues = await this.venuesService.getNearbyVenues(
      latitude,
      longitude,
      radiusKm,
    );

    return {
      success: true,
      count: venues.length,
      data: venues,
    };
  }

  /**
   * GET /venues/:id
   * Halısaha detayı
   */
  @Get(':id')
  async getVenue(@Param('id') id: string) {
    const venue = await this.venuesService.getVenueById(id);
    return {
      success: true,
      data: venue,
    };
  }

  /**
   * GET /venues/:id/matches?date=2025-01-15
   * Bir halısahadaki maçlar
   */
  @Get(':id/matches')
  async getVenueMatches(
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    const matchDate = date ? new Date(date) : undefined;
    const result = await this.venuesService.getVenueMatches(id, matchDate);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /venues
   * Kullanıcı halısaha ekler
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createVenue(@Request() req, @Body() createVenueDto: CreateVenueDto) {
    const userId = req.user.id;
    const venue = await this.venuesService.createVenue(userId, createVenueDto);
    return {
      success: true,
      message: 'Halısaha eklendi. Admin onayı bekleniyor.',
      data: venue,
    };
  }

  /**
   * POST /venues/seed-osm
   * OpenStreetMap'ten halısaha verilerini çek
   * (Sadece geliştirme için - sonra admin guard ekleyeceğiz)
   */
  @Post('seed-osm')
  async seedFromOSM(
    @Body() body: { lat: number; lng: number; radius?: number },
  ) {
    const { lat, lng, radius = 10 } = body;

    if (!lat || !lng) {
      return {
        success: false,
        message: 'Latitude ve longitude gerekli',
      };
    }

    const result = await this.venuesService.seedVenuesFromOSM(lat, lng, radius);
    return {
      success: true,
      message: 'Halısaha verileri OSM\'den çekildi',
      data: result,
    };
  }
}
