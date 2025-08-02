import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserRoleService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.roleDefinition.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async create(id: string) {
    return this.prisma.roleDefinition.create({
      data: { id },
    });
  }

  async update(oldId: string, newId?: string) {
    return this.prisma.roleDefinition.update({
      where: { id: oldId },
      data: newId ? { id: newId } : {},
    });
  }

  async remove(id: string) {
    return this.prisma.roleDefinition.delete({
      where: { id },
    });
  }
}
