import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { PaginationQueryDto } from '../products/dto/pagination-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDto, OrderListPageDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

/**
 * The signed-in customer's orders. Every route is scoped to the caller's
 * `customerId` (guaranteed non-null by JwtAuthGuard — every user is a
 * customer from registration).
 */
@ApiTags('customer-orders')
@ApiBearerAuth()
@Controller('customers/v1/orders')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TransformInterceptor)
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: OrderDto })
  place(
    @CurrentUser('customerId') customerId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.place(customerId, dto);
  }

  @Get()
  @ApiOkResponse({ type: OrderListPageDto })
  findAll(
    @CurrentUser('customerId') customerId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ordersService.findForCustomer(customerId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: OrderDto })
  findOne(
    @CurrentUser('customerId') customerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOneForCustomer(customerId, id);
  }
}
