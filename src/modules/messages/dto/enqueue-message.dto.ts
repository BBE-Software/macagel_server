import { IsString, IsNumber, IsArray, ValidateNested, IsNotEmpty, MaxLength, IsObject, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class MessageHeaderDto {
  @IsNumber()
  v: number;

  @IsString()
  @IsNotEmpty()
  senderIkB64: string;

  @IsString()
  @IsNotEmpty()
  senderEphB64: string;

  @IsString()
  @IsNotEmpty()
  peerSpkId: string;

  @IsString()
  peerOpkId?: string;
}

class FanoutEnvelopeDto {
  @IsString()
  @IsNotEmpty()
  recipientDeviceId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(65536) // 64 KB limit in base64
  ciphertext: string;

  @ValidateNested()
  @Type(() => MessageHeaderDto)
  header: MessageHeaderDto;

  @IsNumber()
  sentAtClient: number;
}

export class EnqueueMessageDto {
  @IsString()
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsString()
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @IsString()
  @IsOptional()
  recipientNickname?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FanoutEnvelopeDto)
  fanout: FanoutEnvelopeDto[];
}


