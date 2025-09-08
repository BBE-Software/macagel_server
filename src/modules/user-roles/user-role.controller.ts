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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/user-roles.decorator';
import { Role } from '../../common/enums/roles.enum';
import { RolesGuard } from '../../common/guards/user-roles.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserRoleService } from './user-role.service';

@Controller('user-roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Get()
  @HttpCode(200)
  async getAllUserRoles() {
    const roles = await this.userRoleService.getAll();

    // TODO: Error Exception

    return {
      status: 'success',
      data: roles,
    };
  }

  @Get(':name')
  @HttpCode(200)
  async getUserRole(@Param('name') name: string) {
    const role = await this.userRoleService.getOne(name);

    // TODO: Error Exception

    return {
      status: 'success',
      data: role,
    };
  }

  @Post()
  @HttpCode(201)
  @Roles(Role.SUPER_ADMIN)
  async createUserRole(@Body() dto: CreateRoleDto) {
    const role = await this.userRoleService.create(dto);

    // TODO: Error Exception

    return {
      status: 'success',
      data: role,
    };
  }

  @Patch(':name')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN)
  async updateUserRole(
    @Param('name') name: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const { oldData, newData } = await this.userRoleService.update(name, dto);

    // TODO: Error Exception

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
  async deleteUserRole(@Param('name') name: string) {
    // TODO: Error Exception

    await this.userRoleService.delete(name);
  }
}
