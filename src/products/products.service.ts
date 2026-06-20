import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

/** A page of results plus the cursor used to request the next page. */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
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
  ) {}

  /** Public catalog: every product, newest first, keyset-paginated. */
  findAllForCustomers(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return this.paginate(query);
  }

  async findOneForCustomers(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found.`);
    }
    return product;
  }

  /** Seller dashboard: only this seller's products. */
  findAllForSeller(
    sellerId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return this.paginate(query, sellerId);
  }

  create(sellerId: string, dto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({ ...dto, sellerId });
    return this.productRepository.save(product);
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
  ): Promise<Product> {
    const result = await this.productRepository.update({ id, sellerId }, dto);
    if (!result.affected) {
      throw new NotFoundException(`Product ${id} not found.`);
    }
    return this.findOneForCustomers(id);
  }

  /** Ownership-scoped delete using the same id + sellerId guard. */
  async remove(id: string, sellerId: string): Promise<void> {
    const result = await this.productRepository.delete({ id, sellerId });
    if (!result.affected) {
      throw new NotFoundException(`Product ${id} not found.`);
    }
  }

  /**
   * Keyset pagination over (createdAt, id) descending. Far more stable than
   * OFFSET on large, frequently-written tables: no row-shift skips/dupes and
   * the index range scan stays O(limit) regardless of depth.
   */
  private async paginate(
    query: PaginationQueryDto,
    sellerId?: string,
  ): Promise<PaginatedResult<Product>> {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .orderBy('product.createdAt', 'DESC')
      .addOrderBy('product.id', 'DESC')
      // Fetch one extra row to detect whether a further page exists.
      .take(query.limit + 1);

    if (sellerId) {
      qb.where('product.sellerId = :sellerId', { sellerId });
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
