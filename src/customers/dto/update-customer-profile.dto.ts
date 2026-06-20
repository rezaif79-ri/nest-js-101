import { IsOptional, IsString, Length } from 'class-validator';

/** Partial update of a customer's personal profile. */
export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  locale?: string;
}
