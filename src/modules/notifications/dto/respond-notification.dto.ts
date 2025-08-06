import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class RespondNotificationDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['accepted', 'rejected'])
  response: 'accepted' | 'rejected';
}