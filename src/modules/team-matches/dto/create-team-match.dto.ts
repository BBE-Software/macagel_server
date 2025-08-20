import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsNumber, IsDateString } from 'class-validator';

export class CreateTeamMatchDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(30)
  @Max(180)
  duration: number;

  @IsEnum(['5v5', '7v7', '11v11'])
  matchType: string;

  @IsOptional()
  @IsNumber()
  pricePerPerson?: number;

  @IsString()
  homeTeamId: string;
}
