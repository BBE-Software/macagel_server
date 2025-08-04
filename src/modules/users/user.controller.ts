import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/user-roles.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { RolesGuard } from 'src/common/guards/user-roles.guard';
import type { RequestWithUser } from 'src/common/types/request-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './user.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(200)
  async getMe(@Req() req: RequestWithUser) {
    const user = await this.usersService.getById(req.user.id);

    // TODO: Error Exception

    return {
      status: 'success',
      data: user,
    };
  }

  @Patch('me')
  @HttpCode(200)
  async updateMe(@Req() req: RequestWithUser, @Body() dto: UpdateUserDto) {
    const result = await this.usersService.updateById(req.user.id, dto);

    // TODO: Error Exception

    return result;
  }

  @Patch('me/deactivate')
  @HttpCode(200)
  async deactivateMe(@Req() req: RequestWithUser) {
    const result = await this.usersService.updateById(req.user.id, {
      is_active: false,
    });

    // TODO: Error Exception

    return result;
  }

  @Get('by-nickname/:nickname')
  @HttpCode(200)
  async getUserByNickname(@Param('nickname') nickname: string) {
    const user = await this.usersService.getByNickname(nickname);

    // TODO: Error Exception

    return {
      status: 'success',
      data: user,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get()
  @HttpCode(200)
  async getAllUsers() {
    const users = await this.usersService.getAll();

    // TODO: Error Exception

    return {
      status: 'success',
      data: users,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get(':id')
  @HttpCode(200)
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getById(id);

    // TODO: Error Exception

    return {
      status: 'success',
      data: user,
    };
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  @HttpCode(200)
  async updateUserById(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const result = await this.usersService.updateById(id, dto);

    // TODO: Error Exception

    return result;
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/deactivate')
  @HttpCode(200)
  async deactivateUserById(@Param('id') id: string) {
    const result = await this.usersService.updateById(id, {
      is_active: false,
    });

    // TODO: Error Exception

    return result;
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  @HttpCode(201)
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);

    // TODO: Error Exception

    return {
      status: 'success',
      data: user,
    };
  }
}
