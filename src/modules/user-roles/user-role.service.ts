import { Injectable } from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UserRoleService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<UserRoles[]> {
    const roles = await this.prisma.userRoles.findMany({
      orderBy: { id: 'asc' },
    });

    // TODO: Error Exception

    return roles;
  }

  async getOne(name: string): Promise<UserRoles | null> {
    const role = await this.prisma.userRoles.findUnique({
      where: { name },
    });

    // TODO: Error Exception

    return role;
  }

  async create(dto: CreateRoleDto): Promise<UserRoles> {
    const role = await this.prisma.userRoles.create({
      data: {
        name: dto.name,
        label: dto.label,
        description: dto.description,
      },
    });

    // TODO: Error Exception

    return role;
  }

  async update(
    name: string,
    dto: UpdateRoleDto,
  ): Promise<{ oldData: UserRoles | null; newData: UserRoles }> {
    const oldData = await this.getOne(name);

    // TODO: Error Exception

    const newData = await this.prisma.userRoles.update({
      where: { name },
      data: dto,
    });

    // TODO: Error Exception

    return { oldData, newData };
  }

  async delete(name: string): Promise<void> {
    const userRole = await this.getOne(name);

    // TODO: Error Exception

    // TODO: userRole security for deletion

    await this.prisma.userRoles.delete({
      where: { name },
    });
  }
}
