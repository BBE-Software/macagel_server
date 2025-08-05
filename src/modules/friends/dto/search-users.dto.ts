import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class SearchUsersDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '20';
}