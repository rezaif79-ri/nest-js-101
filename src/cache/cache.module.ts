import { Global, Module } from '@nestjs/common';
import { CatalogCacheService } from './catalog-cache.service';

/**
 * Global so feature modules can inject CatalogCacheService directly.
 * ConfigModule is already global (see app.module.ts).
 */
@Global()
@Module({
  providers: [CatalogCacheService],
  exports: [CatalogCacheService],
})
export class CacheModule {}
