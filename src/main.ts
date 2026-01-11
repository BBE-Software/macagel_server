import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  const host = process.env.HOST ?? '0.0.0.0'; // Tüm network interface'lerden dinle
  
  await app.listen(port, host);
  
  console.log(`🚀 Server ${host}:${port} adresinde çalışıyor!`);
  console.log(`📡 WebSocket: ws://${host}:${port}`);
  console.log(`🌐 HTTP API: http://${host}:${port}`);
  console.log(`💡 Dışarıdan erişim için: http://YOUR_SERVER_IP:${port}`);
}
bootstrap().catch((err) => console.error(err));
