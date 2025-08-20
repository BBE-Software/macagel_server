import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamMatchDto } from './dto/create-team-match.dto';
import { JoinTeamMatchDto } from './dto/join-team-match.dto';

@Injectable()
export class TeamMatchesService {
  constructor(private prisma: PrismaService) {}

  async createTeamMatch(userId: string, createTeamMatchDto: CreateTeamMatchDto) {
    // Kullanıcının takımın üyesi olduğunu kontrol et
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        team_id: createTeamMatchDto.homeTeamId,
        user_id: userId,
      },
    });

    if (!teamMember) {
      throw new ForbiddenException('Bu takımın üyesi değilsiniz');
    }

    const teamMatch = await this.prisma.teamMatch.create({
      data: {
        title: createTeamMatchDto.title,
        description: createTeamMatchDto.description,
        location: createTeamMatchDto.location,
        latitude: createTeamMatchDto.latitude,
        longitude: createTeamMatchDto.longitude,
        date: new Date(createTeamMatchDto.date),
        duration: createTeamMatchDto.duration,
        match_type: createTeamMatchDto.matchType,
        price_per_person: createTeamMatchDto.pricePerPerson,
        home_team_id: createTeamMatchDto.homeTeamId,
        creator_id: userId,
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
        homeTeam: {
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
        },
        awayTeam: {
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
        },
      },
    });

    return teamMatch;
  }

  async getOpenTeamMatches(filters: {
    city?: string;
    matchType?: string;
    level?: string;
  }) {
    const where: any = {
      status: 'open',
      away_team_id: null, // Sadece rakip arayan maçlar
    };

    if (filters.city) {
      where.location = {
        contains: filters.city,
        mode: 'insensitive',
      };
    }

    if (filters.matchType) {
      where.match_type = filters.matchType;
    }

    if (filters.level) {
      where.homeTeam = {
        level: filters.level,
      };
    }

    return this.prisma.teamMatch.findMany({
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
        homeTeam: {
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
        },
        awayTeam: {
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
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async getUserTeamMatches(userId: string) {
    return this.prisma.teamMatch.findMany({
      where: {
        OR: [
          {
            homeTeam: {
              members: {
                some: {
                  user_id: userId,
                },
              },
            },
          },
          {
            awayTeam: {
              members: {
                some: {
                  user_id: userId,
                },
              },
            },
          },
        ],
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
        homeTeam: {
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
        },
        awayTeam: {
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
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async getTeamMatchById(matchId: string) {
    const teamMatch = await this.prisma.teamMatch.findUnique({
      where: { id: matchId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
          },
        },
        homeTeam: {
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
        },
        awayTeam: {
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
        },
      },
    });

    if (!teamMatch) {
      throw new NotFoundException('Takım maçı bulunamadı');
    }

    return teamMatch;
  }

  async joinTeamMatch(matchId: string, userId: string, joinTeamMatchDto: JoinTeamMatchDto) {
    const teamMatch = await this.prisma.teamMatch.findUnique({
      where: { id: matchId },
    });

    if (!teamMatch) {
      throw new NotFoundException('Takım maçı bulunamadı');
    }

    if (teamMatch.status !== 'open') {
      throw new ForbiddenException('Bu maça artık katılamazsınız');
    }

    if (teamMatch.away_team_id) {
      throw new ForbiddenException('Bu maç için zaten rakip bulunmuş');
    }

    // Kullanıcının takımın üyesi olduğunu kontrol et
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        team_id: joinTeamMatchDto.teamId,
        user_id: userId,
      },
    });

    if (!teamMember) {
      throw new ForbiddenException('Bu takımın üyesi değilsiniz');
    }

    // Aynı takım iki kez katılamaz
    if (teamMatch.home_team_id === joinTeamMatchDto.teamId) {
      throw new ForbiddenException('Kendi takımınızla maç yapamazsınız');
    }

    // Takımı maça ekle
    const updatedMatch = await this.prisma.teamMatch.update({
      where: { id: matchId },
      data: {
        away_team_id: joinTeamMatchDto.teamId,
        status: 'matched',
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
        homeTeam: {
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
        },
        awayTeam: {
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
        },
      },
    });

    return updatedMatch;
  }

  async leaveTeamMatch(matchId: string, userId: string, teamId: string) {
    const teamMatch = await this.prisma.teamMatch.findUnique({
      where: { id: matchId },
    });

    if (!teamMatch) {
      throw new NotFoundException('Takım maçı bulunamadı');
    }

    // Sadece away team çıkabilir
    if (teamMatch.away_team_id !== teamId) {
      throw new ForbiddenException('Sadece deplasman takımı maçtan çıkabilir');
    }

    // Kullanıcının takımın üyesi olduğunu kontrol et
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        team_id: teamId,
        user_id: userId,
      },
    });

    if (!teamMember) {
      throw new ForbiddenException('Bu takımın üyesi değilsiniz');
    }

    // Takımı maçtan çıkar
    const updatedMatch = await this.prisma.teamMatch.update({
      where: { id: matchId },
      data: {
        away_team_id: null,
        status: 'open',
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
        homeTeam: {
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
        },
        awayTeam: {
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
        },
      },
    });

    return updatedMatch;
  }

  async confirmTeamMatch(matchId: string, userId: string) {
    const teamMatch = await this.prisma.teamMatch.findUnique({
      where: { id: matchId },
    });

    if (!teamMatch) {
      throw new NotFoundException('Takım maçı bulunamadı');
    }

    if (teamMatch.status !== 'matched') {
      throw new ForbiddenException('Bu maç henüz eşleşmemiş');
    }

    // Sadece maçı oluşturan kişi onaylayabilir
    if (teamMatch.creator_id !== userId) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    const updatedMatch = await this.prisma.teamMatch.update({
      where: { id: matchId },
      data: {
        status: 'confirmed',
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
        homeTeam: {
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
        },
        awayTeam: {
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
        },
      },
    });

    return updatedMatch;
  }

  async cancelTeamMatch(matchId: string, userId: string) {
    const teamMatch = await this.prisma.teamMatch.findUnique({
      where: { id: matchId },
    });

    if (!teamMatch) {
      throw new NotFoundException('Takım maçı bulunamadı');
    }

    // Sadece maçı oluşturan kişi iptal edebilir
    if (teamMatch.creator_id !== userId) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    const updatedMatch = await this.prisma.teamMatch.update({
      where: { id: matchId },
      data: {
        status: 'cancelled',
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
        homeTeam: {
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
        },
        awayTeam: {
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
        },
      },
    });

    return updatedMatch;
  }
}
