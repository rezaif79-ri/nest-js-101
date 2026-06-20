import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Category } from '../products/entities/category.entity';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesService } from './categories.service';
import { CustomerCategoriesController } from './customer-categories.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    // Provides JwtAuthGuard / AdminGuard for the admin controller.
    AuthModule,
  ],
  controllers: [AdminCategoriesController, CustomerCategoriesController],
  providers: [CategoriesService],
  // Exported so ProductsService can validate category references.
  exports: [CategoriesService],
})
export class CategoriesModule {}
