import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    // TODO: Error Exception

    return user;
  }

  async getByNickname(nickname: string) {
    const user = await this.prisma.user.findUnique({
      where: { nickname },
    });

    // TODO: Error Exception

    return user;
  }

  async getAll() {
    const users = await this.prisma.user.findMany();

    // TODO: Error Exception

    return users;
  }

  async updateById(id: string, dto: UpdateUserDto) {
    const oldData = await this.prisma.user.findUnique({
      where: { id },
    });

    // TODO: Error Exception

    const newData = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    // TODO: Error Exception

    return {
      status: 'success',
      data: {
        oldData,
        newData,
      },
    };
  }

  async create(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: dto.toPrisma(),
    });

    // TODO: Error Exception

    return user;
  }

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    // Dosya uzantısını al
    const extension = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${userId}/profile.${extension}`;

    // Önce eski fotoğrafı sil (varsa)
    await this.supabase.storage
      .from('profile-images')
      .remove([
        `${userId}/profile.jpg`,
        `${userId}/profile.jpeg`,
        `${userId}/profile.png`,
        `${userId}/profile.webp`,
        `${userId}/profile.gif`,
      ]);

    // Yeni fotoğrafı yükle
    const { data, error } = await this.supabase.storage
      .from('profile-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload hatası:', error);
      throw new Error('Fotoğraf yüklenirken hata oluştu');
    }

    // Public URL oluştur
    const { data: publicUrlData } = this.supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    const profileImageUrl = publicUrlData.publicUrl;

    // Kullanıcının profilini güncelle
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { profile_image_url: profileImageUrl },
    });

    return {
      status: 'success',
      data: {
        profile_image_url: profileImageUrl,
        user: updatedUser,
      },
    };
  }

  async removeProfileImage(userId: string) {
    // Kullanıcının mevcut profil resmini al
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.profile_image_url) {
      // Supabase Storage'dan sil
      await this.supabase.storage
        .from('profile-images')
        .remove([
          `${userId}/profile.jpg`,
          `${userId}/profile.jpeg`,
          `${userId}/profile.png`,
          `${userId}/profile.webp`,
          `${userId}/profile.gif`,
        ]);
    }

    // Kullanıcının profilinden URL'i kaldır
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { profile_image_url: null },
    });

    return {
      status: 'success',
      data: {
        user: updatedUser,
      },
      message: 'Profil fotoğrafı kaldırıldı',
    };
  }

  async updateFcmToken(userId: string, fcmToken: string | null) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { fcm_token: fcmToken },
    });

    return {
      status: 'success',
      data: {
        user: updatedUser,
      },
      message: fcmToken ? 'FCM token kaydedildi' : 'FCM token silindi',
    };
  }

  async getNotificationSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        notify_matches: true,
        notify_messages: true,
        notify_friend_requests: true,
      },
    });

    return {
      status: 'success',
      data: user,
    };
  }

  async updateNotificationSettings(
    userId: string,
    settings: {
      notify_matches?: boolean;
      notify_messages?: boolean;
      notify_friend_requests?: boolean;
    },
  ) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: settings,
      select: {
        notify_matches: true,
        notify_messages: true,
        notify_friend_requests: true,
      },
    });

    return {
      status: 'success',
      data: updatedUser,
      message: 'Bildirim ayarları güncellendi',
    };
  }

  async deleteAccount(userId: string) {
    // 1. Kullanıcıyı bul
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // 2. Profil fotoğrafını Supabase Storage'dan sil (varsa)
    if (user.profile_image_url) {
      await this.supabase.storage
        .from('profile-images')
        .remove([
          `${userId}/profile.jpg`,
          `${userId}/profile.jpeg`,
          `${userId}/profile.png`,
          `${userId}/profile.webp`,
          `${userId}/profile.gif`,
        ]);
    }

    // 3. Supabase Auth'dan kullanıcıyı sil
    const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Supabase auth silme hatası:', authError);
      // Auth hatası olsa bile devam et, database'den silinmeli
    }

    // 4. Database'den kullanıcıyı sil (cascade ile ilişkili veriler de silinir)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      status: 'success',
      message: 'Hesap başarıyla silindi',
    };
  }
}
