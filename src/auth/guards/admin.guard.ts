import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * Authorization guard for admin-only routes. Assumes `JwtAuthGuard` ran first
 * and populated `request.user`. Rejects with 403 if the principal is not an
 * admin (i.e. `isAdmin` is false).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user?.isAdmin) {
      throw new ForbiddenException('Administrator access is required.');
    }

    return true;
  }
}
