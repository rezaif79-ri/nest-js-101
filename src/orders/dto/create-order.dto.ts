import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

/** One requested line. Price is intentionally absent — the server re-prices. */
export class OrderItemInput {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ShippingAddressInput {
  @IsString()
  @Length(1, 200)
  fullName!: string;

  @IsString()
  @Length(1, 200)
  line1!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  line2?: string | null;

  @IsString()
  @Length(1, 120)
  city!: string;

  @IsString()
  @Length(1, 20)
  postalCode!: string;

  // ISO-3166 alpha-2.
  @IsString()
  @Length(2, 2)
  country!: string;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];

  @ValidateNested()
  @Type(() => ShippingAddressInput)
  shippingAddress!: ShippingAddressInput;

  // Contact email for this order (may differ from the account email).
  @IsEmail()
  email!: string;
}
