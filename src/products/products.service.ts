import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogCacheService } from '../cache/catalog-cache.service';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from './entities/product.entity';
import { ProductImageView } from './product-images.service';

/** A page of results plus the cursor used to request the next page. */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

/** Product with its images resolved to public URLs for API responses. */
export interface ProductView extends Product {
  images: ProductImageView[];
}

interface Cursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly storage: StorageService,
    private readonly cache: CatalogCacheService,
  ) {}

  /**
   * Public catalog: only ACTIVE products, newest first, keyset-paginated.
   * Cached per (list version, cursor, limit); the version is bumped on any
   * product mutation, superseding all previously cached pages.
   */
  async findAllForCustomers(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Product>> {
    const version = await this.cache.listVersion();
    const key = this.cache.listKey(version, query.cursor, query.limit);

    const cached = await this.cache.get<PaginatedResult<Product>>(key);
    if (cached) {
      return cached;
    }

    const result = await this.paginate(query, undefined, true);
    await this.cache.set(key, result);
    return result;
  }

  /** Public product detail (ACTIVE only), including its image gallery. */
  async findOneForCustomers(id: string): Promise<ProductView> {
    const key = this.cache.productKey(id);

    const cached = await this.cache.get<ProductView>(key);
    if (cached) {
      return cached;
    }

    const view = await this.loadWithImages(id, { activeOnly: true });
    await this.cache.set(key, view);
    return view;
  }

  /**
   * Loads a product with its images and resolves each image to a public URL.
   * Seller/internal callers pass no options (any status); the public detail
   * route passes `activeOnly` so drafts/archived surface as a 404.
   */
  private async loadWithImages(
    id: string,
    opts: { activeOnly?: boolean } = {},
  ): Promise<ProductView> {
    const product = await this.productRepository.findOne({
      where: opts.activeOnly
        ? { id, status: ProductStatus.ACTIVE }
        : { id },
      relations: { images: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found.`);
    }
    return this.serialize(product);
  }

  private serialize(product: Product): ProductView {
    const images = (product.images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((image) => ({
        ...image,
        url: this.storage.publicUrl(image.objectKey),
      }));
    return { ...product, images };
  }

  /** Seller dashboard: only this seller's products. */
  findAllForSeller(
    sellerId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return this.paginate(query, sellerId);
  }

  async create(sellerId: string, dto: CreateProductDto): Promise<ProductView> {
    const slug = await this.generateUniqueSlug(dto.title);
    const product = this.productRepository.create({ ...dto, sellerId, slug });
    const saved = await this.productRepository.save(product);
    return this.serialize(saved);
  }

  /**
   * Builds a URL-safe slug from the title and guarantees uniqueness by
   * appending a short random suffix on collision. Falls back to a generated
   * base when the title slugifies to empty (e.g. all-symbol titles).
   */
  private async generateUniqueSlug(title: string): Promise<string> {
    const base =
      title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'product';

    let candidate = base;
    while (await this.productRepository.exists({ where: { slug: candidate } })) {
      candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    }
    return candidate;
  }

  /**
   * Ownership-scoped update. The WHERE clause matches BOTH id and sellerId,
   * so seller A can never touch seller B's product — a foreign id simply
   * affects zero rows and surfaces as a 404.
   */
  async update(
    id: string,
    sellerId: string,
    dto: UpdateProductDto,
  ): Promise<ProductView> {
    const result = await this.productRepository.update({ id, sellerId }, dto);
    if (!result.affected) {
      throw new NotFoundException(`Product ${id} not found.`);
    }
    await this.cache.invalidateProduct(id);
    return this.loadWithImages(id);
  }

  /**
   * Publish: flip an owned product to `active` so it appears in the public
   * catalog. Ownership-scoped via the same id + sellerId guard.
   */
  publish(id: string, sellerId: string): Promise<ProductView> {
    return this.setStatus(id, sellerId, ProductStatus.ACTIVE);
  }

  /** Unpublish: return an owned product to `draft`, hiding it from customers. */
  unpublish(id: string, sellerId: string): Promise<ProductView> {
    return this.setStatus(id, sellerId, ProductStatus.DRAFT);
  }

  private async setStatus(
    id: string,
    sellerId: string,
    status: ProductStatus,
  ): Promise<ProductView> {
    const result = await this.productRepository.update(
      { id, sellerId },
      { status },
    );
    if (!result.affected) {
      throw new NotFoundException(`Product ${id} not found.`);
    }
    await this.cache.invalidateProduct(id);
    return this.loadWithImages(id);
  }

  /** Ownership-scoped delete using the same id + sellerId guard. */
  async remove(id: string, sellerId: string): Promise<void> {
    const result = await this.productRepository.delete({ id, sellerId });
    if (!result.affected) {
      throw new NotFoundException(`Product ${id} not found.`);
    }
    await this.cache.invalidateProduct(id);
  }

  /**
   * Keyset pagination over (createdAt, id) descending. Far more stable than
   * OFFSET on large, frequently-written tables: no row-shift skips/dupes and
   * the index range scan stays O(limit) regardless of depth.
   */
  private async paginate(
    query: PaginationQueryDto,
    sellerId?: string,
    activeOnly = false,
  ): Promise<PaginatedResult<Product>> {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .orderBy('product.createdAt', 'DESC')
      .addOrderBy('product.id', 'DESC')
      // Fetch one extra row to detect whether a further page exists.
      .take(query.limit + 1);

    if (sellerId) {
      qb.andWhere('product.sellerId = :sellerId', { sellerId });
    }

    if (activeOnly) {
      qb.andWhere('product.status = :active', {
        active: ProductStatus.ACTIVE,
      });
    }

    const cursor = this.decodeCursor(query.cursor);
    if (cursor) {
      // Postgres row-value comparison walks the composite key cleanly.
      qb.andWhere(
        '(product.createdAt, product.id) < (:createdAt, :cursorId)',
        { createdAt: cursor.createdAt, cursorId: cursor.id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: hasMore && last ? this.encodeCursor(last) : null,
    };
  }

  private encodeCursor(product: Product): string {
    const payload: Cursor = {
      createdAt: product.createdAt.toISOString(),
      id: product.id,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeCursor(raw?: string): Cursor | null {
    if (!raw) {
      return null;
    }
    try {
      const decoded = Buffer.from(raw, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as Cursor;
      if (!parsed.createdAt || !parsed.id) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
