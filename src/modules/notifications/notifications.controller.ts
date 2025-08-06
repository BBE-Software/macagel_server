import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { RespondNotificationDto } from './dto/respond-notification.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Kullanıcının bildirimlerini getir
  @Get()
  async getNotifications(@Request() req: any) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  // Okunmamış bildirim sayısını getir
  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  // Maça katılım isteği gönder
  @Post('match-join-request/:lobbyId')
  async sendMatchJoinRequest(
    @Request() req: any,
    @Param('lobbyId') lobbyId: string,
  ) {
    return this.notificationsService.sendMatchJoinRequest(req.user.id, lobbyId);
  }

  // Bildirime yanıt ver
  @Patch(':id/respond')
  async respondToNotification(
    @Request() req: any,
    @Param('id') notificationId: string,
    @Body() respondDto: RespondNotificationDto,
  ) {
    return this.notificationsService.respondToNotification(
      req.user.id,
      notificationId,
      respondDto,
    );
  }

  // Bildirimi okundu olarak işaretle
  @Patch(':id/read')
  async markAsRead(
    @Request() req: any,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, notificationId);
  }

  // Bildirim oluştur (genel endpoint - admin kullanımı için)
  @Post()
  async createNotification(
    @Request() req: any,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.createNotification(
      req.user.id,
      createNotificationDto,
    );
  }
}