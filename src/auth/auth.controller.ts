import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(201)
  async signup(@Body() dto: SignupDto) {
    // TODO: Error Exception
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    // TODO: Error Exception
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Headers('authorization') authHeader: string) {
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      throw new Error('Access token missing');
    }

    return this.authService.logout(accessToken);
  }
}
