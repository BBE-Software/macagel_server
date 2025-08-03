import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from 'src/common/enums/roles.enum';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UserRoleService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.roleDefinition.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async getOne(name: string) {
    return this.prisma.roleDefinition.findUnique({
      where: { name },
    });
  }

  async create(dto: CreateRoleDto) {
    return this.prisma.roleDefinition.create({
      data: {
        name: dto.name,
        label: dto.label,
        description: dto.description,
      },
    });
  }

  async update(name: string, dto: UpdateRoleDto) {
    return this.prisma.roleDefinition.update({
      where: { name },
      data: dto,
    });
  }

  async delete(name: string) {
    const protectedRoles = [Role.USER, Role.ADMIN, Role.SUPER_ADMIN];

    if (protectedRoles.includes(name as Role)) {
      throw new ForbiddenException(`Role '${name}' cannot be deleted.`);
    }

    return this.prisma.roleDefinition.delete({
      where: { name },
    });
  }
}
