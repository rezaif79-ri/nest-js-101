import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { CategoriesService } from './categories.service';

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
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }
}
