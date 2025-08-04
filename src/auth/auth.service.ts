import { Injectable } from '@nestjs/common';
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
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(`Signup failed: ${error?.message}`);
    }

    return {
      status: 'success',
      message: 'User created in auth. Please complete your profile.',
      data: {
        user_id: data.user.id,
      },
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new Error(`Login failed: ${error?.message}`);
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
}
