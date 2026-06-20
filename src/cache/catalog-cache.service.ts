import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis-backed cache for the public catalog. Every method fails open: if Redis
 * is unreachable or errors, reads return a miss and writes are no-ops, so the
 * catalog degrades to direct DB access rather than erroring.
 *
 * List pages are invalidated via a monotonic version counter baked into their
 * keys: bumping the version orphans every old list key at once (they expire on
 * TTL), which is cheaper and safer than scanning for keys to delete.
 */
@Injectable()
export class CatalogCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CatalogCacheService.name);
  private readonly redis: Redis;
  private readonly ttl: number;
  private readonly prefix = 'catalog';

  constructor(config: ConfigService) {
    this.ttl = config.get<number>('CACHE_TTL_SECONDS', 60);
    this.redis = new Redis({
      host: config.getOrThrow<string>('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      // Bound the wait when Redis is unhealthy so requests fail over to the DB
      // quickly instead of hanging.
      maxRetriesPerRequest: 2,
    });
    // Without an 'error' listener ioredis would throw on connection issues.
    this.redis.on('error', (err) =>
      this.logger.warn(`Redis error: ${err.message}`),
    );
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`Cache get failed for ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl = this.ttl): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      this.logger.warn(`Cache set failed for ${key}: ${(err as Error).message}`);
    }
  }

  productKey(id: string): string {
    return `${this.prefix}:product:${id}`;
  }

  listKey(version: number, cursor: string | undefined, limit: number): string {
    return `${this.prefix}:list:v${version}:${cursor ?? 'root'}:${limit}`;
  }

  /** Current list-cache version; defaults to 0 (and fails open to 0). */
  async listVersion(): Promise<number> {
    try {
      const raw = await this.redis.get(`${this.prefix}:list:ver`);
      return raw ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Invalidate everything affected by a product mutation: drop its detail key
   * and bump the list version so all cached pages are superseded.
   */
  async invalidateProduct(id: string): Promise<void> {
    try {
      await Promise.all([
        this.redis.del(this.productKey(id)),
        this.redis.incr(`${this.prefix}:list:ver`),
      ]);
    } catch (err) {
      this.logger.warn(
        `Cache invalidation failed for ${id}: ${(err as Error).message}`,
      );
    }
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
