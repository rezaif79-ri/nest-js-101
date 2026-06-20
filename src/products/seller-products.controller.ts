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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SellerGuard } from '../auth/guards/seller.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { ConfirmImageDto } from './dto/confirm-image.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PresignImageDto } from './dto/presign-image.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImagesService } from './product-images.service';
import { ProductsService } from './products.service';

/**
 * Seller-owned product management. Every route runs behind JwtAuthGuard then
 * SellerGuard, so `sellerId` is guaranteed non-null by the time a handler
 * runs. All writes are scoped to the caller's own `sellerId`.
 */
@ApiTags('seller-products')
@ApiBearerAuth()
@Controller('sellers/v1/products')
@UseGuards(JwtAuthGuard, SellerGuard)
@UseInterceptors(TransformInterceptor)
export class SellerProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly imagesService: ProductImagesService,
  ) {}

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

  /** Make the product visible in the public catalog. */
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.publish(id, sellerId);
  }

  /** Hide the product from the public catalog (back to draft). */
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.unpublish(id, sellerId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(id, sellerId);
  }

  // --- Images ---

  /** Step 1: get a presigned URL to upload an image straight to the bucket. */
  @Post(':id/images/presign')
  @HttpCode(HttpStatus.OK)
  presignImage(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PresignImageDto,
  ) {
    return this.imagesService.createPresignedUpload(id, sellerId, dto);
  }

  /** Step 2: confirm the uploaded object so it's recorded on the product. */
  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  confirmImage(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmImageDto,
  ) {
    return this.imagesService.confirm(id, sellerId, dto);
  }

  @Get(':id/images')
  listImages(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.imagesService.list(id, sellerId);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(
    @CurrentUser('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.imagesService.remove(id, imageId, sellerId);
  }
}
