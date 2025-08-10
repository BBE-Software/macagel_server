import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { SportModule } from './modules/sports/sport.module';
import { UserRoleModule } from './modules/user-roles/user-role.module';
import { UsersModule } from './modules/users/user.module';
import { MessagesModule } from './modules/messages/messages.module';
import { FriendsModule } from './modules/friends/friends.module';
import { PrismaModule } from './prisma/prisma.module';
import { MatchLobbyModule } from './modules/match-lobby/match-lobby.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule, 
    AuthModule, 
    UserRoleModule, 
    SportModule, 
    UsersModule, 
    MessagesModule, 
    FriendsModule, 
    MatchLobbyModule, 
    NotificationsModule
  ],
})
export class AppModule {}
