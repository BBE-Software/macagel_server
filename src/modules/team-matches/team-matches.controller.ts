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
import { TeamMatchesService } from './team-matches.service';
import { CreateTeamMatchDto } from './dto/create-team-match.dto';
import { JoinTeamMatchDto } from './dto/join-team-match.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('team-matches')
@UseGuards(JwtAuthGuard)
export class TeamMatchesController {
  constructor(private readonly teamMatchesService: TeamMatchesService) {}

  // Takım maçı oluştur
  @Post()
  async createTeamMatch(
    @Request() req: any,
    @Body() createTeamMatchDto: CreateTeamMatchDto,
  ) {
    return this.teamMatchesService.createTeamMatch(req.user.id, createTeamMatchDto);
  }

  // Açık takım maçlarını getir
  @Get('open')
  async getOpenTeamMatches(
    @Request() req: any,
    @Query('city') city?: string,
    @Query('match_type') matchType?: string,
    @Query('level') level?: string,
  ) {
    return this.teamMatchesService.getOpenTeamMatches({
      city,
      matchType,
      level,
    });
  }

  // Kullanıcının takım maçlarını getir
  @Get('my-matches')
  async getUserTeamMatches(@Request() req: any) {
    return this.teamMatchesService.getUserTeamMatches(req.user.id);
  }

  // Belirli bir takım maçını getir
  @Get(':id')
  async getTeamMatchById(@Request() req: any, @Param('id') matchId: string) {
    return this.teamMatchesService.getTeamMatchById(matchId);
  }

  // Takım maçına katıl
  @Post(':id/join')
  async joinTeamMatch(
    @Request() req: any,
    @Param('id') matchId: string,
    @Body() joinTeamMatchDto: JoinTeamMatchDto,
  ) {
    return this.teamMatchesService.joinTeamMatch(matchId, req.user.id, joinTeamMatchDto);
  }

  // Takım maçından çık
  @Delete(':id/teams/:teamId')
  async leaveTeamMatch(
    @Request() req: any,
    @Param('id') matchId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamMatchesService.leaveTeamMatch(matchId, req.user.id, teamId);
  }

  // Takım maçını onayla
  @Post(':id/confirm')
  async confirmTeamMatch(
    @Request() req: any,
    @Param('id') matchId: string,
  ) {
    return this.teamMatchesService.confirmTeamMatch(matchId, req.user.id);
  }

  // Takım maçını iptal et
  @Post(':id/cancel')
  async cancelTeamMatch(
    @Request() req: any,
    @Param('id') matchId: string,
  ) {
    return this.teamMatchesService.cancelTeamMatch(matchId, req.user.id);
  }
}
