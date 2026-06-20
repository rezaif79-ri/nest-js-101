import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../common/upload';
import type { AllowedImageType } from '../../common/upload';

export class PresignImageDto {
  @IsIn(ALLOWED_IMAGE_TYPES)
  contentType!: AllowedImageType;

  // Optional client-declared size, rejected early if over the limit.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_IMAGE_BYTES)
  sizeBytes?: number;
}
