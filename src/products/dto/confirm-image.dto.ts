import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

/**
 * Sent after the client has uploaded to the presigned URL. `objectKey` must be
 * one the server issued (validated against the product's prefix); the rest is
 * optional metadata the client can supply from the picked file.
 */
export class ConfirmImageDto {
  @IsString()
  @Length(1, 1024)
  objectKey!: string;

  @IsOptional()
  @IsString()
  @Length(1, 300)
  altText?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  contentType?: string;
}
