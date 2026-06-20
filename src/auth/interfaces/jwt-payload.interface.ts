/**
 * Shape of the signed JWT body. `customerId` is always present (every user
 * is a customer from registration); `sellerId` is null until the user
 * activates their seller profile.
 */
export interface JwtPayload {
  /** User id (standard JWT subject claim). */
  sub: string;
  email: string;
  customerId: string | null;
  sellerId: string | null;
}

/**
 * Authenticated principal attached to `request.user` by the JWT guard.
 * A flattened, intention-revealing view of the token payload.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  customerId: string | null;
  sellerId: string | null;
}
