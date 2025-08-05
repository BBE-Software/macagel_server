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
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('search')
  async searchUsers(
    @Request() req: any,
    @Query() searchUsersDto: SearchUsersDto,
  ) {
    return this.friendsService.searchUsers(req.user.id, searchUsersDto);
  }

  @Post('request')
  async sendFriendRequest(
    @Request() req: any,
    @Body() sendFriendRequestDto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendFriendRequest(req.user.id, sendFriendRequestDto);
  }

  @Patch('request/:requestId')
  async respondToFriendRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
    @Body() respondFriendRequestDto: RespondFriendRequestDto,
  ) {
    return this.friendsService.respondToFriendRequest(
      req.user.id,
      requestId,
      respondFriendRequestDto,
    );
  }

  @Get('requests/received')
  async getReceivedFriendRequests(@Request() req: any) {
    return this.friendsService.getReceivedFriendRequests(req.user.id);
  }

  @Get('requests/sent')
  async getSentFriendRequests(@Request() req: any) {
    return this.friendsService.getSentFriendRequests(req.user.id);
  }

  @Get('list')
  async getFriends(@Request() req: any) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Delete(':friendId')
  async removeFriend(
    @Request() req: any,
    @Param('friendId') friendId: string,
  ) {
    return this.friendsService.removeFriend(req.user.id, friendId);
  }

  @Delete('request/:requestId')
  async cancelFriendRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.cancelFriendRequest(req.user.id, requestId);
  }

  @Get(':friendId/status')
  async getFriendshipStatus(
    @Request() req: any,
    @Param('friendId') friendId: string,
  ) {
    const status = await this.friendsService.getFriendshipStatus(req.user.id, friendId);
    return { status };
  }
}