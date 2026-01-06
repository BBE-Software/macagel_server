import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/user-roles.decorator';
import { Role } from '../../common/enums/roles.enum';
import { RolesGuard } from '../../common/guards/user-roles.guard';
import type { RequestWithUser } from '../../common/types/request-user.type';
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

  @Post('me/profile-image')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('image'))
  async uploadProfileImage(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Dosya yüklenmedi');
    }

    // Dosya boyutu kontrolü (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Dosya boyutu 5MB\'dan büyük olamaz');
    }

    // Dosya tipi kontrolü
    console.log('📸 Yüklenen dosya:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
    ];
    
    // Dosya uzantısına göre de kontrol et (bazı cihazlar yanlış mime type gönderebilir)
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];
    
    if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(extension || '')) {
      throw new BadRequestException(`Sadece JPEG, PNG, WebP ve GIF formatları desteklenir. Gelen format: ${file.mimetype}`);
    }

    // 🔒 Magic bytes kontrolü - dosyanın gerçekten resim olduğunu doğrula
    const magicBytes = file.buffer.slice(0, 8);
    const isValidImage = this.validateImageMagicBytes(magicBytes);
    if (!isValidImage) {
      throw new BadRequestException('Geçersiz resim dosyası');
    }

    const result = await this.usersService.uploadProfileImage(req.user.id, file);
    return result;
  }

  @Patch('me/remove-profile-image')
  @HttpCode(200)
  async removeProfileImage(@Req() req: RequestWithUser) {
    const result = await this.usersService.removeProfileImage(req.user.id);
    return result;
  }

  @Post('me/fcm-token')
  @HttpCode(200)
  async registerFcmToken(
    @Req() req: RequestWithUser,
    @Body() body: { fcm_token: string },
  ) {
    const result = await this.usersService.updateFcmToken(req.user.id, body.fcm_token);
    return result;
  }

  @Patch('me/fcm-token')
  @HttpCode(200)
  async updateFcmToken(
    @Req() req: RequestWithUser,
    @Body() body: { fcm_token: string },
  ) {
    const result = await this.usersService.updateFcmToken(req.user.id, body.fcm_token);
    return result;
  }

  @Delete('me/fcm-token')
  @HttpCode(200)
  async deleteFcmToken(@Req() req: RequestWithUser) {
    const result = await this.usersService.updateFcmToken(req.user.id, null);
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

  @Get('profile/:id')
  @HttpCode(200)
  async getUserProfile(@Param('id') id: string) {
    const user = await this.usersService.getById(id);

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

  // 🔒 Magic bytes kontrolü - dosyanın gerçekten resim olduğunu doğrular
  private validateImageMagicBytes(buffer: Buffer): boolean {
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return true;
    }
    // GIF: 47 49 46 38
    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    ) {
      return true;
    }
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    ) {
      return true;
    }
    // HEIC/HEIF: ftyp ile başlar (offset 4'te)
    if (buffer.length >= 12) {
      const ftyp = buffer.slice(4, 8).toString('ascii');
      if (ftyp === 'ftyp') {
        return true;
      }
    }
    return false;
  }
}
