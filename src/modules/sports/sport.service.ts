import { Injectable } from '@nestjs/common';
import { Sport } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';

@Injectable()
export class SportService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<Sport[]> {
    const sports = await this.prisma.sport.findMany({
      orderBy: { id: 'asc' },
    });

    // TODO: Error Exception

    return sports;
  }

  async getOne(name: string): Promise<Sport | null> {
    const sport = await this.prisma.sport.findUnique({
      where: { name },
    });

    // TODO: Error Exception

    return sport;
  }

  async create(data: CreateSportDto): Promise<Sport> {
    const sport = await this.prisma.sport.create({ data });

    // TODO: Error Exception

    return sport;
  }

  async update(
    name: string,
    data: UpdateSportDto,
  ): Promise<{ oldData: Sport | null; newData: Sport }> {
    const oldData = await this.getOne(name);

    // TODO: Error Exception

    const newData = await this.prisma.sport.update({
      where: { name },
      data,
    });

    // TODO: Error Exception

    return { oldData, newData };
  }

  async delete(name: string): Promise<void> {
    const sport = await this.getOne(name);

    // TODO: Error Exception

    await this.prisma.sport.delete({ where: { name } });
  }
}
