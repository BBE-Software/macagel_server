import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Mevcut şifre gerekli' })
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'Yeni şifre en az 6 karakter olmalı' })
  @IsNotEmpty({ message: 'Yeni şifre gerekli' })
  newPassword: string;
}
