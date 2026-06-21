import { ApiProperty } from '@nestjs/swagger';

/** The authenticated customer's identity + profile, as returned by GET /me. */
export class MeDto {
  @ApiProperty({ format: 'uuid', description: 'User id (the auth principal).' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ format: 'uuid', description: 'Customer profile id.' })
  customerId!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'displayName, else firstName + lastName, else null.',
  })
  fullName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  displayName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  firstName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ type: String, nullable: true })
  locale!: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl!: string | null;
}
