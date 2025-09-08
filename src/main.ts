import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Sadece önemli logları tut
  });

  // CORS'u enable et - Flutter uygulaması için gerekli
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000', 
      'http://10.0.2.2:3300',
      'http://192.168.1.2:3300', // PC gerçek IP
      '*' // Development için tüm origin'lere izin
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global prefix kaldırıldı - Flutter'da /auth endpoint'leri kullanıyoruz
  // app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3300;
  await app.listen(port);
  console.log(`🚀 Server ${port} portunda çalışıyor!`);
  console.log(`📡 WebSocket: ws://localhost:${port}`);
  console.log(`🌐 HTTP API: http://localhost:${port}`);
}
bootstrap().catch((err) => console.error(err));
