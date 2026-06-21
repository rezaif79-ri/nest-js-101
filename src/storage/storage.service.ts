import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin wrapper over the S3 SDK pointed at MinIO (or any S3-compatible store).
 * Owns the single S3 client and the bucket name; callers deal only in object
 * keys and never see the client or bucket directly.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    const useSsl = config.get('MINIO_USE_SSL') === 'true';
    const endpointHost = config.getOrThrow<string>('MINIO_ENDPOINT');
    const port = config.get<string>('MINIO_PORT', '443');
    const endpoint = `${useSsl ? 'https' : 'http'}://${endpointHost}:${port}`;

    this.bucket = config.getOrThrow<string>('MINIO_BUCKET');
    this.publicBase =
      config.get<string>('MINIO_PUBLIC_URL') ?? `${endpoint}/${this.bucket}`;

    this.client = new S3Client({
      endpoint,
      region: config.get<string>('MINIO_REGION', 'us-east-1'),
      // Path-style addressing is required for MinIO and custom S3 hosts.
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.getOrThrow<string>('MINIO_ROOT_USER'),
        secretAccessKey: config.getOrThrow<string>('MINIO_ROOT_PASSWORD'),
      },
    });
  }

  /**
   * Presigned PUT URL for a direct browser-to-bucket upload. The contentType is
   * bound into the signature, so the client must send the same Content-Type
   * header on upload.
   */
  presignUpload(
    objectKey: string,
    contentType: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /** Best-effort delete; logs and swallows errors so DB cleanup can proceed. */
  async deleteObject(objectKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to delete object ${objectKey}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Public (or CDN) URL for an object key, for inclusion in API responses.
   * If the stored key is already an absolute http(s) URL (e.g. seeded
   * placeholder imagery that lives off-bucket), it is returned verbatim so it
   * still resolves; otherwise it is prefixed with the bucket/CDN base.
   */
  publicUrl(objectKey: string): string {
    if (/^https?:\/\//i.test(objectKey)) {
      return objectKey;
    }
    return `${this.publicBase}/${objectKey}`;
  }
}
