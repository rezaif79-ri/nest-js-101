import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

/**
 * Augments Express's Request so `request.user`, populated by `JwtAuthGuard`,
 * is strongly typed everywhere downstream (guards, decorators, controllers).
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
