import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SportModule } from './modules/sports/sport.module';
import { UserRoleModule } from './modules/user-roles/user-role.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, UserRoleModule, SportModule],
})
export class AppModule {}
