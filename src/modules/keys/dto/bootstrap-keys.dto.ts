import { IsString, IsArray, IsNotEmpty, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class IdentityDto {
  @IsString()
  @IsNotEmpty()
  ed25519Public: string;
}

export class SignedPrekeyDto {
  @IsString()
  @IsNotEmpty()
  keyId: string;

  @IsString()
  @IsNotEmpty()
  x25519Public: string;

  @IsString()
  @IsNotEmpty()
  signatureEd25519: string;

  @IsString()
  @IsNotEmpty()
  validUntil: string;
}

export class OneTimePrekeyDto {
  @IsString()
  @IsNotEmpty()
  keyId: string;

  @IsString()
  @IsNotEmpty()
  x25519Public: string;
}

export class BootstrapKeysDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsNotEmpty()
  deviceType: string;

  @ValidateNested()
  @Type(() => IdentityDto)
  identity: IdentityDto;

  @ValidateNested()
  @Type(() => SignedPrekeyDto)
  signedPreKey: SignedPrekeyDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OneTimePrekeyDto)
  oneTimePreKeys: OneTimePrekeyDto[];

  @IsString()
  @IsOptional()
  appVersion?: string;
}


