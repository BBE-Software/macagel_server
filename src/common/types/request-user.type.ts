import { Request } from 'express';
import { Role } from '../enums/roles.enum';

export interface RequestUser {
  id: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user: RequestUser;
}
