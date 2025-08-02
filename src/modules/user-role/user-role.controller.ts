import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { RolesGuard } from 'src/common/guards/user-roles.guard';
import { UserRoleService } from './user-role.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAll() {
    return this.userRoleService.getAll();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() body: { id: string }) {
    return this.userRoleService.create(body.id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() body: { id?: string }) {
    return this.userRoleService.update(id, body.id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.userRoleService.remove(id);
  }
}
