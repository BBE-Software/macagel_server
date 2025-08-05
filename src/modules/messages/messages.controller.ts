import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
  Patch,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async createMessage(
    @Request() req: any,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(req.user.id, createMessageDto);
  }

  @Get('conversations')
  async getConversations(@Request() req: any) {
    return this.messagesService.getConversations(req.user.id);
  }

  @Get('conversations/:conversationId')
  async getMessages(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Query() getMessagesDto: GetMessagesDto,
  ) {
    return this.messagesService.getMessages(
      req.user.id,
      conversationId,
      getMessagesDto,
    );
  }

  @Patch('conversations/:conversationId/read')
  async markAsRead(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.markMessagesAsRead(req.user.id, conversationId);
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.deleteConversation(req.user.id, conversationId);
  }
}