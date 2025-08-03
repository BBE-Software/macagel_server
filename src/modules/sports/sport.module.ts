import { Module } from '@nestjs/common';
import { SportsController } from './sport.controller';
import { SportService } from './sport.service';

@Module({
  controllers: [SportsController],
  providers: [SportService],
  exports: [SportModule],
})
export class SportModule {}
