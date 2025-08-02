import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  RequestUser,
  RequestWithUser,
} from 'src/common/types/request-user.type';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    request.user = user as unknown as RequestUser;

    return user;
  }
}
