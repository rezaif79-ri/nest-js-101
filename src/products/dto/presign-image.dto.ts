import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

/** Image MIME types we accept for product images. */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** 10 MB ceiling, enforced at presign-request time. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class PresignImageDto {
  @IsIn(ALLOWED_IMAGE_TYPES)
  contentType!: (typeof ALLOWED_IMAGE_TYPES)[number];

  // Optional client-declared size, rejected early if over the limit.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_IMAGE_BYTES)
  sizeBytes?: number;
}
