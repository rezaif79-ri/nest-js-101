import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogCacheService } from '../cache/catalog-cache.service';
import { EXTENSION_BY_TYPE } from '../common/upload';
import { StorageService } from '../storage/storage.service';
import { ConfirmImageDto } from './dto/confirm-image.dto';
import { PresignImageDto } from './dto/presign-image.dto';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';

/** A product image enriched with its resolved public URL for API responses. */
export interface ProductImageView extends ProductImage {
  url: string;
}

@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
    private readonly storage: StorageService,
    private readonly cache: CatalogCacheService,
  ) {}

  /**
   * Issue a presigned PUT URL for a new image. The object key is generated
   * server-side under the product's prefix so the later confirm step can verify
   * the upload targeted this product.
   */
  async createPresignedUpload(
    productId: string,
    sellerId: string,
    dto: PresignImageDto,
  ): Promise<{ objectKey: string; uploadUrl: string; expiresIn: number }> {
    await this.assertOwnedProduct(productId, sellerId);

    const ext = EXTENSION_BY_TYPE[dto.contentType];
    const objectKey = `products/${productId}/${randomUUID()}.${ext}`;
    const expiresIn = 300;
    const uploadUrl = await this.storage.presignUpload(
      objectKey,
      dto.contentType,
      expiresIn,
    );

    return { objectKey, uploadUrl, expiresIn };
  }

  /**
   * Record an uploaded image against the product. Verifies the key was issued
   * for this product, then appends it at the next gallery position.
   */
  async confirm(
    productId: string,
    sellerId: string,
    dto: ConfirmImageDto,
  ): Promise<ProductImageView> {
    await this.assertOwnedProduct(productId, sellerId);

    if (!dto.objectKey.startsWith(`products/${productId}/`)) {
      throw new BadRequestException(
        'objectKey does not belong to this product.',
      );
    }

    const count = await this.imageRepository.count({ where: { productId } });
    const image = this.imageRepository.create({
      productId,
      objectKey: dto.objectKey,
      position: count,
      altText: dto.altText ?? null,
      width: dto.width ?? null,
      height: dto.height ?? null,
      sizeBytes: dto.sizeBytes ?? null,
      contentType: dto.contentType ?? null,
    });
    const saved = await this.imageRepository.save(image);
    // The product's cached detail (and any list thumbnail) is now stale.
    await this.cache.invalidateProduct(productId);
    return this.toView(saved);
  }

  /** All images for an owned product, gallery order. */
  async list(
    productId: string,
    sellerId: string,
  ): Promise<ProductImageView[]> {
    await this.assertOwnedProduct(productId, sellerId);
    const images = await this.imageRepository.find({
      where: { productId },
      order: { position: 'ASC' },
    });
    return images.map((image) => this.toView(image));
  }

  /** Remove an image row and best-effort delete the underlying object. */
  async remove(
    productId: string,
    imageId: string,
    sellerId: string,
  ): Promise<void> {
    await this.assertOwnedProduct(productId, sellerId);
    const image = await this.imageRepository.findOne({
      where: { id: imageId, productId },
    });
    if (!image) {
      throw new NotFoundException(`Image ${imageId} not found.`);
    }
    await this.imageRepository.delete({ id: imageId });
    await this.storage.deleteObject(image.objectKey);
    await this.cache.invalidateProduct(productId);
  }

  private async assertOwnedProduct(
    id: string,
    sellerId: string,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, sellerId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found.`);
    }
    return product;
  }

  private toView(image: ProductImage): ProductImageView {
    return { ...image, url: this.storage.publicUrl(image.objectKey) };
  }
}
