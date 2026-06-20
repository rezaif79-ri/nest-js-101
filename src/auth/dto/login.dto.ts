import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  password!: string;
}

export class AuthTokenResponse {
  accessToken!: string;
  customerId!: string | null;
  sellerId!: string | null;
}
