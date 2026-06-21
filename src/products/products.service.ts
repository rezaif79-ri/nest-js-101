import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CatalogCacheService } from '../cache/catalog-cache.service';
import { CategoriesService } from '../categories/categories.service';
import { generateUniqueSlug, slugify } from '../common/slugify';
import { StorageService } from '../storage/storage.service';
import { CatalogQueryDto, CatalogSort } from './dto/catalog-query.dto';
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

/** Product detail with its full image gallery + a convenience primary image. */
export interface ProductView extends Product {
  images: ProductImageView[];
  primaryImage: ProductImageView | null;
}

/** Catalog card: the product (minus the gallery) plus its primary image. */
export type ProductListItemView = Omit<Product, 'images'> & {
  primaryImage: ProductImageView | null;
};

/** Keyset cursor carrying every field any sort might compare on. */
interface Cursor {
  createdAt: string;
  price: number;
  id: string;
}

interface PaginateOptions {
  sellerId?: string;
  activeOnly?: boolean;
  categoryIds?: string[];
  featured?: boolean;
  q?: string;
  sort?: CatalogSort;
  withImages?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly storage: StorageService,
    private readonly cache: CatalogCacheService,
    private readonly categories: CategoriesService,
  ) {}

  /**
   * Public catalog: only ACTIVE products, keyset-paginated. `categoryId` rolls
   * up to include descendant categories. Cached per (list version, filters,
   * cursor, limit); the version is bumped on any product mutation.
   */
  async findAllForCustomers(
    query: CatalogQueryDto,
  ): Promise<PaginatedResult<ProductListItemView>> {
    const version = await this.cache.listVersion();
    const key = this.cache.listKey(version, {
      cursor: query.cursor,
      limit: query.limit,
      categoryId: query.categoryId,
      sort: query.sort,
      q: query.q,
      featured: query.featured,
    });

    const cached =
      await this.cache.get<PaginatedResult<ProductListItemView>>(key);
    if (cached) {
      return cached;
    }

    // Roll the requested category up to its whole subtree so top-level pages
    // (which have no directly-assigned products) still return their leaves'.
    const categoryIds = query.categoryId
      ? await this.categories.getSubtreeIds(query.categoryId)
      : undefined;

    const page = await this.paginate(query, {
      activeOnly: true,
      categoryIds,
      featured: query.featured,
      q: query.q,
      sort: query.sort,
      withImages: true,
    });

    const result: PaginatedResult<ProductListItemView> = {
      items: await Promise.all(page.items.map((p) => this.serializeListItem(p))),
      nextCursor: page.nextCursor,
    };
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

  /** Public product detail by slug (ACTIVE only) — for clean /product/{slug} URLs. */
  async findOneBySlugForCustomers(slug: string): Promise<ProductView> {
    const product = await this.productRepository.findOne({
      where: { slug, status: ProductStatus.ACTIVE },
      relations: { images: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${slug} not found.`);
    }
    const view = await this.serialize(product);
    await this.cache.set(this.cache.productKey(product.id), view);
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
      where: opts.activeOnly ? { id, status: ProductStatus.ACTIVE } : { id },
      relations: { images: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found.`);
    }
    return this.serialize(product);
  }

  /** Sorted, presigned-URL-resolved images from a raw image list. */
  private async resolveImages(
    images: Product['images'],
  ): Promise<ProductImageView[]> {
    const sorted = (images ?? []).slice().sort((a, b) => a.position - b.position);
    return Promise.all(
      sorted.map(async (image) => ({
        ...image,
        url: await this.storage.presignDownload(image.objectKey),
      })),
    );
  }

  /** Full detail view (gallery + primary image). */
  private async serialize(product: Product): Promise<ProductView> {
    const images = await this.resolveImages(product.images);
    return { ...product, images, primaryImage: images[0] ?? null };
  }

  /** Card view: drops the gallery, keeps just the primary image. */
  private async serializeListItem(product: Product): Promise<ProductListItemView> {
    const { images, ...rest } = product;
    const resolved = await this.resolveImages(images);
    return { ...rest, primaryImage: resolved[0] ?? null };
  }

  /** Seller dashboard: only this seller's products. */
  findAllForSeller(
    sellerId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return this.paginate(query, { sellerId });
  }

  async create(sellerId: string, dto: CreateProductDto): Promise<ProductView> {
    if (dto.categoryId) {
      // 404s if the category doesn't exist, before we persist a dangling FK.
      await this.categories.requireExisting(dto.categoryId);
    }
    const slug = await this.generateUniqueSlug(dto.title);
    const product = this.productRepository.create({ ...dto, sellerId, slug });
    const saved = await this.productRepository.save(product);
    return this.serialize(saved);
  }

  /**
   * Builds a URL-safe slug from the title, unique across the catalog. Falls
   * back to a generated base when the title slugifies to empty (e.g. all-symbol
   * titles).
   */
  private generateUniqueSlug(title: string): Promise<string> {
    return generateUniqueSlug(slugify(title, 'product'), (candidate) =>
      this.productRepository.exists({ where: { slug: candidate } }),
    );
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
    if (dto.categoryId) {
      await this.categories.requireExisting(dto.categoryId);
    }
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
   * Keyset pagination over a sort-dependent composite key. Far more stable than
   * OFFSET on large, frequently-written tables: no row-shift skips/dupes and
   * the index range scan stays O(limit) regardless of depth. The cursor carries
   * every field a sort might compare on, and the ORDER BY + comparison switch
   * on the chosen sort.
   */
  private async paginate(
    query: PaginationQueryDto,
    opts: PaginateOptions = {},
  ): Promise<PaginatedResult<Product>> {
    const sort = opts.sort ?? CatalogSort.NEWEST;
    const qb = this.productRepository
      .createQueryBuilder('product')
      // Fetch one extra row to detect whether a further page exists.
      .take(query.limit + 1);

    if (opts.withImages) {
      // TypeORM applies the limit via a distinct subquery when a *-to-many
      // relation is joined, so keyset pagination stays correct.
      qb.leftJoinAndSelect('product.images', 'image');
    }

    this.applyOrder(qb, sort);

    if (opts.sellerId) {
      qb.andWhere('product.sellerId = :sellerId', { sellerId: opts.sellerId });
    }
    if (opts.activeOnly) {
      qb.andWhere('product.status = :active', { active: ProductStatus.ACTIVE });
    }
    if (opts.categoryIds && opts.categoryIds.length > 0) {
      qb.andWhere('product.categoryId IN (:...categoryIds)', {
        categoryIds: opts.categoryIds,
      });
    }
    if (opts.featured) {
      qb.andWhere('product.featured = true');
    }
    if (opts.q) {
      qb.andWhere(
        '(product.title ILIKE :q OR product.shortDescription ILIKE :q)',
        { q: `%${opts.q}%` },
      );
    }

    const cursor = this.decodeCursor(query.cursor);
    if (cursor) {
      this.applyCursor(qb, sort, cursor);
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

  private applyOrder(qb: SelectQueryBuilder<Product>, sort: CatalogSort): void {
    switch (sort) {
      case CatalogSort.PRICE_ASC:
        qb.orderBy('product.price', 'ASC').addOrderBy('product.id', 'ASC');
        break;
      case CatalogSort.PRICE_DESC:
        qb.orderBy('product.price', 'DESC').addOrderBy('product.id', 'DESC');
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC').addOrderBy(
          'product.id',
          'DESC',
        );
    }
  }

  private applyCursor(
    qb: SelectQueryBuilder<Product>,
    sort: CatalogSort,
    cursor: Cursor,
  ): void {
    // Postgres row-value comparison walks the composite key cleanly.
    switch (sort) {
      case CatalogSort.PRICE_ASC:
        qb.andWhere('(product.price, product.id) > (:price, :cursorId)', {
          price: cursor.price,
          cursorId: cursor.id,
        });
        break;
      case CatalogSort.PRICE_DESC:
        qb.andWhere('(product.price, product.id) < (:price, :cursorId)', {
          price: cursor.price,
          cursorId: cursor.id,
        });
        break;
      default:
        qb.andWhere(
          '(product.createdAt, product.id) < (:createdAt, :cursorId)',
          { createdAt: cursor.createdAt, cursorId: cursor.id },
        );
    }
  }

  private encodeCursor(product: Product): string {
    const payload: Cursor = {
      createdAt: product.createdAt.toISOString(),
      price: product.price,
      id: product.id,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeCursor(raw?: string): Cursor | null {
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(
        Buffer.from(raw, 'base64url').toString('utf8'),
      ) as Cursor;
      if (!parsed.id) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
