import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(3, 200)
  title!: string;

  // Optional list/card blurb. The full body lives in `description`.
  @IsOptional()
  @IsString()
  @Length(1, 300)
  shortDescription?: string;

  @IsString()
  @Length(1, 5000)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  // ISO 4217 code; defaults to the store base currency when omitted.
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
