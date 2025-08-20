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
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // Takım oluştur
  @Post()
  async createTeam(
    @Request() req: any,
    @Body() createTeamDto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(req.user.id, createTeamDto);
  }

  // Kullanıcının takımlarını getir
  @Get('my-teams')
  async getUserTeams(@Request() req: any) {
    return this.teamsService.getUserTeams(req.user.id);
  }

  // Tüm takımları getir (filtreleme ile)
  @Get()
  async getAllTeams(
    @Request() req: any,
    @Query('city') city?: string,
    @Query('level') level?: string,
    @Query('min_players') minPlayers?: string,
    @Query('max_players') maxPlayers?: string,
  ) {
    return this.teamsService.getAllTeams({
      city,
      level,
      minPlayers: minPlayers ? parseInt(minPlayers) : undefined,
      maxPlayers: maxPlayers ? parseInt(maxPlayers) : undefined,
    });
  }

  // Belirli bir takımı getir
  @Get(':id')
  async getTeamById(@Request() req: any, @Param('id') teamId: string) {
    return this.teamsService.getTeamById(teamId);
  }

  // Takımı güncelle (sadece oluşturan kişi)
  @Put(':id')
  async updateTeam(
    @Request() req: any,
    @Param('id') teamId: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(teamId, req.user.id, updateTeamDto);
  }

  // Takıma üye ekle
  @Post(':id/members')
  async addMember(
    @Request() req: any,
    @Param('id') teamId: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.teamsService.addMember(teamId, req.user.id, addMemberDto);
  }

  // Takımdan üye çıkar
  @Delete(':id/members/:userId')
  async removeMember(
    @Request() req: any,
    @Param('id') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.removeMember(teamId, req.user.id, userId);
  }

  // Takımı sil (sadece oluşturan kişi)
  @Delete(':id')
  async deleteTeam(@Request() req: any, @Param('id') teamId: string) {
    return this.teamsService.deleteTeam(teamId, req.user.id);
  }
}
