import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async createTeam(userId: string, createTeamDto: CreateTeamDto) {
    // Transaction kullanarak hem takım oluştur hem de üye ekle
    const team = await this.prisma.$transaction(async (prisma) => {
      // Takımı oluştur
      const team = await prisma.team.create({
        data: {
          name: createTeamDto.name,
          description: createTeamDto.description,
          city: createTeamDto.city,
          level: createTeamDto.level,
          max_players: createTeamDto.maxPlayers,
          current_players: 1, // Oluşturan kişi otomatik üye olur
          logo_url: createTeamDto.logoUrl,
          creator_id: userId,
        },
      });

      // Oluşturan kişiyi takıma ekle
      await prisma.teamMember.create({
        data: {
          team_id: team.id,
          user_id: userId,
          role: 'captain',
        },
      });

      // Takımı tüm ilişkileriyle birlikte getir
      return prisma.team.findUnique({
        where: { id: team.id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              surname: true,
              nickname: true,
            },
          },
          members: {
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
          },
        },
      });
    });

    return team!;
  }

  async getUserTeams(userId: string) {
    return this.prisma.team.findMany({
      where: {
        members: {
          some: {
            user_id: userId,
          },
        },
        is_active: true,
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
        members: {
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
        },
      },
    });
  }

  async getAllTeams(filters: {
    city?: string;
    level?: string;
    minPlayers?: number;
    maxPlayers?: number;
  }) {
    const where: any = {
      is_active: true,
    };

    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.level) {
      where.level = filters.level;
    }

    if (filters.minPlayers) {
      where.current_players = {
        gte: filters.minPlayers,
      };
    }

    if (filters.maxPlayers) {
      where.max_players = {
        lte: filters.maxPlayers,
      };
    }

    return this.prisma.team.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
          },
        },
        members: {
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
        },
      },
    });
  }

  async getTeamById(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
          },
        },
        members: {
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
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Takım bulunamadı');
    }

    return team;
  }

  async updateTeam(teamId: string, userId: string, updateTeamDto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Takım bulunamadı');
    }

    if (team.creator_id !== userId) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        name: updateTeamDto.name,
        description: updateTeamDto.description,
        city: updateTeamDto.city,
        level: updateTeamDto.level,
        max_players: updateTeamDto.maxPlayers,
        logo_url: updateTeamDto.logoUrl,
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
        members: {
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
        },
      },
    });
  }

  async addMember(teamId: string, userId: string, addMemberDto: AddMemberDto) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Takım bulunamadı');
    }

    // Sadece takım kaptanı veya oluşturan kişi üye ekleyebilir
    const member = await this.prisma.teamMember.findFirst({
      where: {
        team_id: teamId,
        user_id: userId,
        role: { in: ['captain', 'coach'] },
      },
    });

    if (!member && team.creator_id !== userId) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    // Kullanıcı zaten üye mi kontrol et
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: addMemberDto.userId,
        },
      },
    });

    if (existingMember) {
      throw new ForbiddenException('Kullanıcı zaten takımın üyesi');
    }

    // Takım dolu mu kontrol et
    if (team.current_players >= team.max_players) {
      throw new ForbiddenException('Takım dolu');
    }

    // Üyeyi ekle
    await this.prisma.teamMember.create({
      data: {
        team_id: teamId,
        user_id: addMemberDto.userId,
        position: addMemberDto.position,
        role: addMemberDto.role || 'member',
      },
    });

    // Takım üye sayısını güncelle
    await this.prisma.team.update({
      where: { id: teamId },
      data: {
        current_players: {
          increment: 1,
        },
      },
    });

    return this.getTeamById(teamId);
  }

  async removeMember(teamId: string, userId: string, memberUserId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Takım bulunamadı');
    }

    // Sadece takım kaptanı veya oluşturan kişi üye çıkarabilir
    const member = await this.prisma.teamMember.findFirst({
      where: {
        team_id: teamId,
        user_id: userId,
        role: { in: ['captain', 'coach'] },
      },
    });

    if (!member && team.creator_id !== userId) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    // Üyeyi çıkar
    await this.prisma.teamMember.delete({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: memberUserId,
        },
      },
    });

    // Takım üye sayısını güncelle
    await this.prisma.team.update({
      where: { id: teamId },
      data: {
        current_players: {
          decrement: 1,
        },
      },
    });

    return this.getTeamById(teamId);
  }

  async deleteTeam(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Takım bulunamadı');
    }

    if (team.creator_id !== userId) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    // Takımı pasif yap (silme yerine)
    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        is_active: false,
      },
    });
  }
}
