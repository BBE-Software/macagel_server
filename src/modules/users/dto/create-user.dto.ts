import { Prisma } from '@prisma/client';
import { IsDateString, IsEmail, IsString, Length, Matches } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

export class CreateUserDto extends UpdateUserDto {
  @IsEmail()
  declare email: string;

  @IsString()
  declare name: string;

  @IsString()
  declare surname: string;

  @IsString()
  @Length(3, 16)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Nickname can only contain letters, numbers, and underscores',
  })
  declare nickname: string;

  @IsDateString()
  declare birthday: string;

  @IsString()
  declare gender: string;

  @IsString()
  declare country_code: string;

  @IsString()
  declare role_name: string;

  toPrisma(): Prisma.UserCreateInput {
    const { birthday, role_name, ...rest } = this;

    return {
      ...rest,
      birthday: new Date(birthday),
      role: {
        connect: {
          name: role_name,
        },
      },
    };
  }
}
