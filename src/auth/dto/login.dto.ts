import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  password!: string;
}

export class AuthTokenResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({
    description: 'Access-token lifetime in seconds.',
    example: 86400,
  })
  expiresIn!: number;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  customerId!: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sellerId!: string | null;
}
