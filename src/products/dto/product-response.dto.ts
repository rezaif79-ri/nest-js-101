import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../entities/product.entity';

/** A product image resolved to a publicly fetchable absolute URL. */
export class ProductImageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'https://cdn.example.com/object.webp' })
  url!: string;

  @ApiProperty({ type: String, nullable: true })
  altText!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 1200 })
  width!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 1200 })
  height!: number | null;

  @ApiProperty({ example: 0 })
  position!: number;
}

/** Shared scalar product fields present on both list items and detail. */
class ProductBaseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  shortDescription!: string | null;

  @ApiProperty({ example: 1299.0 })
  price!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 25 })
  stock!: number;

  @ApiProperty({ example: false })
  featured!: boolean;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  categoryId!: string | null;

  @ApiProperty({ type: ProductImageDto, nullable: true })
  primaryImage!: ProductImageDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

/** Catalog card: scalar fields + just the primary image (small payload). */
export class ProductListItemDto extends ProductBaseDto {}

/** Product detail: adds the full ordered image gallery and description. */
export class ProductDetailDto extends ProductBaseDto {
  @ApiProperty()
  description!: string;

  @ApiProperty({ type: [ProductImageDto] })
  images!: ProductImageDto[];
}

export class ProductListPageDto {
  @ApiProperty({ type: [ProductListItemDto] })
  items!: ProductListItemDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}
