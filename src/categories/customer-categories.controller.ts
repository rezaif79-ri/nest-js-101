import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { CategoriesService } from './categories.service';
import { CategoryDetailDto, CategoryDto } from './dto/category-response.dto';

/**
 * Public, read-only category surface for customers — used to render the catalog
 * navigation and to discover the `categoryId` values accepted by the catalog
 * list filter.
 */
@ApiTags('customer-categories')
@Controller('customers/v1/categories')
@UseInterceptors(TransformInterceptor)
export class CustomerCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOkResponse({ type: [CategoryDto] })
  findAll() {
    return this.categoriesService.findAll();
  }

  // Declared before ':id' so the literal segment wins the route match.
  @Get('by-slug/:slug')
  @ApiOkResponse({ type: CategoryDetailDto })
  findOneBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlugWithChildren(slug);
  }

  @Get(':id')
  @ApiOkResponse({ type: CategoryDetailDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOneWithChildren(id);
  }
}
