import { IsOptional, IsString, IsUUID, Length, ValidateIf } from 'class-validator';

/**
 * Partial update payload. Only provided fields are applied. `parentId` accepts
 * `null` to detach a category back to the top level, which is why it allows
 * null explicitly rather than relying on `@IsOptional`.
 */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  // `null` => make top-level; a uuid => reparent; absent => leave unchanged.
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
