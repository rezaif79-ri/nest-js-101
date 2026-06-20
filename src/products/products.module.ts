import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { CustomerProductsController } from './customer-products.controller';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductImagesService } from './product-images.service';
import { ProductsService } from './products.service';
import { SellerProductsController } from './seller-products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, ProductImage]),
    // Provides JwtAuthGuard / SellerGuard (and JwtModule) for seller routes.
    AuthModule,
    // Provides CategoriesService so create/update can validate categoryId.
    CategoriesModule,
  ],
  controllers: [CustomerProductsController, SellerProductsController],
  providers: [ProductsService, ProductImagesService],
})
export class ProductsModule {}
