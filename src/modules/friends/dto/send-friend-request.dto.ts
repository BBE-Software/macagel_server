import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class SendFriendRequestDto {
  @IsNotEmpty()
  @IsUUID()
  receiverId: string;

  @IsOptional()
  @IsString()
  message?: string;
}