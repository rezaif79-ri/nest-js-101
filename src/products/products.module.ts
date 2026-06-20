import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CustomerProductsController } from './customer-products.controller';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { SellerProductsController } from './seller-products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    // Provides JwtAuthGuard / SellerGuard (and JwtModule) for seller routes.
    AuthModule,
  ],
  controllers: [CustomerProductsController, SellerProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
