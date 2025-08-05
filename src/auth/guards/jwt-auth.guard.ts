import { Injectable, UnauthorizedException, CanActivate, ExecutionContext } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { Role } from 'src/common/enums/roles.enum';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token bulunamadı');
    }

    const token = authHeader.substring(7); // "Bearer " kısmını çıkar

    try {
      // Supabase ile token'ı verify et
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        throw new UnauthorizedException('Geçersiz token');
      }

      // Request'e user bilgisini ekle
      request.user = {
        id: user.id,
        role: Role.USER, // Default role
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token doğrulanamadı');
    }
  }
}
