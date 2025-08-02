import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from 'src/common/enums/roles.enum';
import { RequestUser } from 'src/common/types/request-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SUPABASE_JWT_SECRET!,
    });
  }

  validate(payload: { sub: string; role: Role }): RequestUser {
    return {
      id: payload.sub,
      role: payload.role,
    };
  }
}
