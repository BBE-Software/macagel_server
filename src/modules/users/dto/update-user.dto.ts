import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  surname?: string;

  @IsOptional()
  @IsString()
  @Length(3, 16)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Nickname can only contain letters, numbers, and underscores',
  })
  nickname?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  weight?: number;

  @IsOptional()
  @IsString()
  @Length(1, 16)
  gender?: string;

  @IsOptional()
  @IsBoolean()
  show_gender?: boolean;

  @IsOptional()
  @IsBoolean()
  show_height?: boolean;

  @IsOptional()
  @IsBoolean()
  show_weight?: boolean;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country_code?: string;

  @IsOptional()
  @IsBoolean()
  is_private?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  current_latitude?: number;

  @IsOptional()
  @IsNumber()
  current_longitude?: number;
}
