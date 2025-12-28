import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MatchLobbyService } from './match-lobby.service';
import { CreateMatchLobbyDto } from './dto/create-match-lobby.dto';
import { JoinLobbyDto } from './dto/join-lobby.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('match-lobby')
@UseGuards(JwtAuthGuard)
export class MatchLobbyController {
  constructor(private readonly matchLobbyService: MatchLobbyService) {}

  // Yeni maç lobisi oluştur
  @Post()
  async createLobby(
    @Request() req: any,
    @Body() createLobbyDto: CreateMatchLobbyDto,
  ) {
    return this.matchLobbyService.createLobby(req.user.id, createLobbyDto);
  }

  // Tüm açık maç lobilerini getir
  @Get()
  async getLobbies(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('location') location?: string,
  ) {
    return this.matchLobbyService.getLobbies(req.user.id, { status, location });
  }

  // Kullanıcının katıldığı maçları getir
  @Get('my-lobbies')
  async getUserLobbies(@Request() req: any) {
    return this.matchLobbyService.getUserLobbies(req.user.id);
  }

  // Belirli bir maç lobisini getir
  @Get(':id')
  async getLobbyById(@Request() req: any, @Param('id') lobbyId: string) {
    return this.matchLobbyService.getLobbyById(lobbyId, req.user.id);
  }

  // Maç lobisine katıl
  @Post(':id/join')
  async joinLobby(
    @Request() req: any,
    @Param('id') lobbyId: string,
    @Body() joinLobbyDto: JoinLobbyDto,
  ) {
    return this.matchLobbyService.joinLobby(lobbyId, req.user.id, joinLobbyDto);
  }

  // ======= YENİ: Katılım İsteği Sistemi =======
  
  /**
   * POST /match-lobby/:id/join-request
   * Maça katılım isteği gönder
   */
  @Post(':id/join-request')
  async requestToJoin(
    @Request() req: any,
    @Param('id') lobbyId: string,
    @Body() body: { message?: string; venueId?: string },
  ) {
    return this.matchLobbyService.createJoinRequest(
      lobbyId,
      req.user.id,
      body.message,
      body.venueId,
    );
  }

  /**
   * GET /match-lobby/:id/join-requests
   * Maçın katılım isteklerini getir (sadece maç sahibi)
   */
  @Get(':id/join-requests')
  async getJoinRequests(
    @Request() req: any,
    @Param('id') lobbyId: string,
  ) {
    return this.matchLobbyService.getJoinRequests(lobbyId, req.user.id);
  }

  /**
   * PATCH /match-lobby/join-requests/:requestId/accept
   * Katılım isteğini onayla (sadece maç sahibi)
   */
  @Put('join-requests/:requestId/accept')
  async acceptJoinRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
  ) {
    return this.matchLobbyService.acceptJoinRequest(requestId, req.user.id);
  }

  /**
   * PATCH /match-lobby/join-requests/:requestId/reject
   * Katılım isteğini reddet (sadece maç sahibi)
   */
  @Put('join-requests/:requestId/reject')
  async rejectJoinRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
  ) {
    return this.matchLobbyService.rejectJoinRequest(requestId, req.user.id);
  }

  // ======= YENİ SON =======

  // Maç lobisinden ayrıl
  @Delete(':id/leave')
  async leaveLobby(@Request() req: any, @Param('id') lobbyId: string) {
    return this.matchLobbyService.leaveLobby(lobbyId, req.user.id);
  }

  // Maç lobisini güncelle (sadece oluşturan kişi)
  @Put(':id')
  async updateLobby(
    @Request() req: any,
    @Param('id') lobbyId: string,
    @Body() updateLobbyDto: CreateMatchLobbyDto,
  ) {
    return this.matchLobbyService.updateLobby(lobbyId, req.user.id, updateLobbyDto);
  }

  // Katılımcıyı at (sadece oluşturan kişi)
  @Delete(':id/participants/:participantId')
  async kickParticipant(
    @Request() req: any,
    @Param('id') lobbyId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.matchLobbyService.kickParticipant(lobbyId, req.user.id, participantId);
  }

  // Maç lobisini sil (sadece oluşturan kişi)
  @Delete(':id')
  async deleteLobby(@Request() req: any, @Param('id') lobbyId: string) {
    return this.matchLobbyService.deleteLobby(lobbyId, req.user.id);
  }

  // Süresi geçen maçları temizle (admin endpoint)
  @Post('cleanup')
  async cleanupExpiredMatches(@Request() req: any) {
    return this.matchLobbyService.cleanupExpiredMatches();
  }
}
