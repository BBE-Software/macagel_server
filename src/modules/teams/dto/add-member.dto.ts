import { IsString, IsOptional, IsEnum } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsEnum(['member', 'captain', 'coach'])
  role?: string;
}
