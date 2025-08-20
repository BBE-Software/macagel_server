import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  city: string;

  @IsEnum(['amateur', 'semi-pro', 'professional'])
  level: string;

  @IsInt()
  @Min(5)
  @Max(50)
  maxPlayers: number;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
