import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { ProductsService } from './products.service';

/**
 * Public, read-only catalog surface for customers. No seller scoping here —
 * customers browse every product.
 */
@ApiTags('customer-products')
@Controller('customers/v1/products')
@UseInterceptors(TransformInterceptor)
export class CustomerProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.productsService.findAllForCustomers(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOneForCustomers(id);
  }
}
