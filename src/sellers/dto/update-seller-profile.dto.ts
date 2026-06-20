import { IsOptional, IsString, Length } from 'class-validator';

/** Partial update of a seller's personal profile and storefront details. */
export class UpdateSellerProfileDto {
  // --- Personal ---
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

  // --- Storefront ---
  @IsOptional()
  @IsString()
  @Length(1, 120)
  shopName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 140)
  shopSlug?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  shopDescription?: string;
}
