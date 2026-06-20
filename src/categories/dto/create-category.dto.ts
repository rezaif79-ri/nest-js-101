import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  // Optional parent for a shallow tree (e.g. "Laptops" under "Electronics").
  // Omit for a top-level category. Validated to exist by the service.
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
