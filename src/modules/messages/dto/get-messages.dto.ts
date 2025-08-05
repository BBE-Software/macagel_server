import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class GetMessagesDto {
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '50';

  @IsOptional()
  @IsString()
  conversationId?: string;
}