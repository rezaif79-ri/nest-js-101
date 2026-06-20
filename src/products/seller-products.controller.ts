import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SellerGuard } from '../auth/guards/seller.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

/**
 * Seller-owned product management. Every route runs behind JwtAuthGuard then
 * SellerGuard, so `sellerId` is guaranteed non-null by the time a handler
 * runs. All writes are scoped to the caller's own `sellerId`.
 */
@Controller('sellers/v1/products')
@UseGuards(JwtAuthGuard, SellerGuard)
@UseInterceptors(TransformInterceptor)
export class SellerProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @CurrentUser('sellerId') sellerId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.productsService.findAllForSeller(sellerId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('sellerId') sellerId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(sellerId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, sellerId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(id, sellerId);
  }
}
