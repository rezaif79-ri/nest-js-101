import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../upload';
import type { AllowedImageType } from '../upload';

/** Request for a presigned image upload (avatars, shop logos). */
export class PresignUploadDto {
  @IsIn(ALLOWED_IMAGE_TYPES)
  contentType!: AllowedImageType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_IMAGE_BYTES)
  sizeBytes?: number;
}
