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
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { SportService } from './sport.service';

@Controller('sports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SportsController {
  constructor(private readonly sportService: SportService) {}

  @Get()
  @HttpCode(200)
  async getAllSports() {
    const sports = await this.sportService.getAll();

    // TODO: Error Exception

    return {
      status: 'success',
      data: sports,
    };
  }

  @Get(':name')
  @HttpCode(200)
  async getSport(@Param('name') name: string) {
    const sport = await this.sportService.getOne(name);

    // TODO: Error Exception

    return {
      status: 'success',
      data: sport,
    };
  }

  @Post()
  @HttpCode(201)
  @Roles(Role.SUPER_ADMIN)
  async createSport(@Body() dto: CreateSportDto) {
    const sport = await this.sportService.create(dto);

    // TODO: Error Exception

    return {
      status: 'success',
      data: sport,
    };
  }

  @Patch(':name')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN)
  async updateSport(@Param('name') name: string, @Body() dto: UpdateSportDto) {
    const { oldData, newData } = await this.sportService.update(name, dto);

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
  async deleteSport(@Param('name') name: string) {
    // TODO: Error Exception

    await this.sportService.delete(name);
  }
}
