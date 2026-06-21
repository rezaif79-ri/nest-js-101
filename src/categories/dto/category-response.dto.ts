import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  parentId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

/** Category detail with its direct children (one level). */
export class CategoryDetailDto extends CategoryDto {
  @ApiProperty({ type: [CategoryDto] })
  children!: CategoryDto[];
}
