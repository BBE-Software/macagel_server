import { Module } from '@nestjs/common';
import { MatchLobbyService } from './match-lobby.service';
import { MatchLobbyController } from './match-lobby.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MatchLobbyService],
  controllers: [MatchLobbyController],
  exports: [MatchLobbyService],
})
export class MatchLobbyModule {}
