import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { RolesGuard } from 'src/common/guards/user-roles.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserRoleService } from './user-role.service';

@Controller('user-roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Get()
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getAll() {
    const userRoles = await this.userRoleService.getAll();
    return {
      status: 'success',
      data: userRoles,
    };
  }

  @Get(':name')
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getOne(@Param('name') name: string) {
    const role = await this.userRoleService.getOne(name);
    return {
      status: 'success',
      data: role,
    };
  }

  @Post()
  @HttpCode(201)
  @Roles(Role.SUPER_ADMIN)
  async create(@Body() dto: CreateRoleDto) {
    const newRole = await this.userRoleService.create(dto);
    return {
      status: 'success',
      data: newRole,
    };
  }

  @Patch(':name')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN)
  async update(@Param('name') name: string, @Body() dto: UpdateRoleDto) {
    const oldData = await this.userRoleService.getOne(name);
    const newData = await this.userRoleService.update(name, dto);

    return {
      status: 'success',
      data: {
        oldData,
        newData,
      },
    };
  }

  @Delete(':name')
  @HttpCode(204)
  @Roles(Role.SUPER_ADMIN)
  async delete(@Param('name') name: string) {
    await this.userRoleService.delete(name);
  }
}
