import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

/**
 * Public catalog list query: keyset pagination plus an optional category
 * filter. `categoryId` narrows results to a single category (discover valid
 * ids via customers/v1/categories).
 */
export class CatalogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
