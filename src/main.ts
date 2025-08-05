import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS'u enable et - Flutter uygulaması için gerekli
  app.enableCors({
    origin: true, // Tüm origin'lere izin ver (development için)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global prefix kaldırıldı - Flutter'da /auth endpoint'leri kullanıyoruz
  // app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3300);
}
bootstrap().catch((err) => console.error(err));
