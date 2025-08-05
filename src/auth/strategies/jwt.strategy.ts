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
      secretOrKey: 'temp-secret', // Geçici secret
      ignoreExpiration: true, // Development için
    });
  }

  validate(payload: any): RequestUser {
    console.log('🔐 JWT Strategy validate çağrıldı');
    console.log('📄 Payload:', JSON.stringify(payload, null, 2));
    
    const userId = payload.sub || payload.id || 'temp-user-id';
    console.log('👤 Extracted User ID:', userId);
    
    return {
      id: userId,
      role: Role.USER,
    };
  }
}
