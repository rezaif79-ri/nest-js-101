import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

/** Catalog ordering. `newest` is the default keyset over (createdAt, id). */
export enum CatalogSort {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

/**
 * Public catalog list query: keyset pagination plus optional category filter
 * (rolled up to include descendant categories), ordering, full-text-ish search
 * and a curated `featured` filter.
 */
export class CatalogQueryDto extends PaginationQueryDto {
  // Filters to this category AND all of its descendants (discover ids via
  // customers/v1/categories).
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(CatalogSort)
  sort: CatalogSort = CatalogSort.NEWEST;

  // Case-insensitive match over title / shortDescription.
  @IsOptional()
  @IsString()
  @Length(1, 100)
  q?: string;

  // `?featured=true` restricts to the curated homepage strip.
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )
  @IsBoolean()
  featured?: boolean;
}
