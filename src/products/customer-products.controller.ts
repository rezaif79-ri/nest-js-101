import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import {
  ProductDetailDto,
  ProductListPageDto,
} from './dto/product-response.dto';
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
  @ApiOkResponse({ type: ProductListPageDto })
  findAll(@Query() query: CatalogQueryDto) {
    return this.productsService.findAllForCustomers(query);
  }

  // Declared before ':id' so the literal segment wins the route match.
  @Get('by-slug/:slug')
  @ApiOkResponse({ type: ProductDetailDto })
  findOneBySlug(@Param('slug') slug: string) {
    return this.productsService.findOneBySlugForCustomers(slug);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductDetailDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOneForCustomers(id);
  }
}
