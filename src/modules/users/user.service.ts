import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    // TODO: Error Exception

    return user;
  }

  async getByNickname(nickname: string) {
    const user = await this.prisma.user.findUnique({
      where: { nickname },
    });

    // TODO: Error Exception

    return user;
  }

  async getAll() {
    const users = await this.prisma.user.findMany();

    // TODO: Error Exception

    return users;
  }

  async updateById(id: string, dto: UpdateUserDto) {
    const oldData = await this.prisma.user.findUnique({
      where: { id },
    });

    // TODO: Error Exception

    const newData = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    // TODO: Error Exception

    return {
      status: 'success',
      data: {
        oldData,
        newData,
      },
    };
  }

  async create(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: dto,
    });

    // TODO: Error Exception

    return user;
  }
}
