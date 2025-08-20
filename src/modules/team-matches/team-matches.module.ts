import { Module } from '@nestjs/common';
import { TeamMatchesController } from './team-matches.controller';
import { TeamMatchesService } from './team-matches.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeamMatchesController],
  providers: [TeamMatchesService],
  exports: [TeamMatchesService],
})
export class TeamMatchesModule {}
