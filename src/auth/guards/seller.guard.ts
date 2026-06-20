import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * Authorization guard for seller-only routes. Assumes `JwtAuthGuard` ran
 * first and populated `request.user`. Rejects with 403 if the principal
 * has not activated a seller profile (i.e. `sellerId` is null).
 */
@Injectable()
export class SellerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user?.sellerId) {
      throw new ForbiddenException(
        'An active seller profile is required for this action.',
      );
    }

    return true;
  }
}
