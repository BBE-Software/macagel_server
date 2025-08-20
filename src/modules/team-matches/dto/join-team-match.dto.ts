import { IsString } from 'class-validator';

export class JoinTeamMatchDto {
  @IsString()
  teamId: string;
}
