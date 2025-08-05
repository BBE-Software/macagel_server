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
    
    console.log('🛡️ JwtAuthGuard canActivate çağrıldı');
    console.log('📍 URL:', request.url);
    console.log('🔑 Auth Header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'NULL');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token bulunamadı veya Bearer format değil');
      throw new UnauthorizedException('Token bulunamadı');
    }

    const token = authHeader.substring(7); // "Bearer " kısmını çıkar
    console.log('🎫 Extracted Token:', `${token.substring(0, 20)}...`);

    try {
      // Supabase ile token'ı verify et
      console.log('🔍 Supabase token doğrulaması başlıyor...');
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      console.log('📄 Supabase Response:', { user: user?.id, error: error?.message });
      
      if (error || !user) {
        console.log('❌ Supabase token doğrulama hatası:', error?.message);
        throw new UnauthorizedException('Geçersiz token');
      }

      console.log('✅ Token doğrulandı, User ID:', user.id);

      // Request'e user bilgisini ekle
      request.user = {
        id: user.id,
        role: Role.USER, // Default role
      };

      return true;
    } catch (error) {
      console.log('❌ Token doğrulama exception:', error.message);
      throw new UnauthorizedException('Token doğrulanamadı');
    }
  }
}
