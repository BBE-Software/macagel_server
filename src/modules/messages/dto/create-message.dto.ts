import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsUUID()
  receiverId: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  messageType?: string = 'text';
}