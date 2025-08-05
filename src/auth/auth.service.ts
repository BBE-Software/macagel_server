import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(private readonly prisma: PrismaService) {}

  async signup(dto: SignupDto) {
    // 1. Supabase auth'da user oluştur
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (error || !data.user) {
      // E-mail zaten kayıtlı hatası
      if (error?.message?.includes('already been registered')) {
        throw new BadRequestException('Bu e-mail adresi zaten kayıtlı. Lütfen farklı bir e-mail deneyin.');
      }
      // Diğer hatalar
      throw new BadRequestException(`Kayıt işlemi başarısız: ${error?.message || 'Bilinmeyen hata'}`);
    }

    try {
      // 2. Prisma database'de User kaydı oluştur
      // Email'den nickname oluştur (16 karakter limit)
      const emailUsername = dto.email.split('@')[0];
      const shortNickname = emailUsername.length > 12 
        ? emailUsername.substring(0, 12) 
        : emailUsername;
      const uniqueNickname = `${shortNickname}${Date.now().toString().slice(-3)}`;

      const user = await this.prisma.user.create({
        data: {
          id: data.user.id,
          email: dto.email,
          name: dto.name || 'Kullanıcı', // Fallback değer
          surname: dto.surname || 'Soyadı', // Fallback değer
          nickname: uniqueNickname, // 16 karakter altında unique nickname
          birthday: dto.birthday ? new Date(dto.birthday) : new Date('2000-01-01'), // Fallback tarih
          gender: dto.gender || 'Belirtilmemiş', // Fallback cinsiyet
          country_code: 'TR', // Varsayılan Türkiye
          role_name: 'user', // Varsayılan rol (user_roles tablosunda mevcut)
        },
      });

      return {
        status: 'success',
        message: 'Kullanıcı başarıyla oluşturuldu. Profil bilgilerinizi tamamlayın.',
        data: {
          user_id: data.user.id,
          database_user: user,
        },
      };
    } catch (prismaError: any) {
      // Database hatası olursa Supabase'den de kullanıcıyı sil
      await this.supabase.auth.admin.deleteUser(data.user.id);
      throw new BadRequestException(`Database kayıt hatası: ${prismaError?.message || 'Bilinmeyen hata'}`);
    }
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      // Geçersiz credentials hatası
      if (error?.message?.includes('Invalid login credentials')) {
        throw new UnauthorizedException('E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
      }
      // Diğer hatalar
      throw new BadRequestException(`Giriş işlemi başarısız: ${error?.message || 'Bilinmeyen hata'}`);
    }

    return {
      status: 'success',
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: data.user,
      },
    };
  }

  async logout(accessToken: string) {
    const { error } = await this.supabase.auth.admin.signOut(accessToken);

    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }

    return {
      status: 'success',
      message: 'User logged out successfully',
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        nickname: true,
        birthday: true,
        height: true,
        weight: true,
        gender: true,
        position: true,
        preferred_foot: true,
        show_gender: true,
        show_height: true,
        show_weight: true,
        country_code: true,
        is_private: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        role_name: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    return user;
  }
}
