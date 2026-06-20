/** Image MIME types accepted for any upload (product images, avatars, logos). */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** 10 MB ceiling, enforced at presign-request time. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Maps an accepted MIME type to the file extension used in the object key. */
export const EXTENSION_BY_TYPE: Record<AllowedImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
