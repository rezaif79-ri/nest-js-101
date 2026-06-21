import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../entities/order.entity';
import { PaymentStatus } from '../../payments/entities/payment.entity';

export class ShippingAddressDto {
  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  line1!: string;

  @ApiProperty({ type: String, nullable: true })
  line2!: string | null;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  postalCode!: string;

  @ApiProperty({ description: 'ISO-3166 alpha-2.' })
  country!: string;
}

export class OrderItemDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  productId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ example: 24.99 })
  unitPrice!: number;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 49.98 })
  lineTotal!: number;
}

export class PaymentInfoDto {
  @ApiProperty({ example: 'mock' })
  provider!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ type: String, nullable: true })
  snapToken!: string | null;

  @ApiProperty({ type: String, nullable: true })
  redirectUrl!: string | null;
}

export class OrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ type: [OrderItemDto] })
  items!: OrderItemDto[];

  @ApiProperty({ example: 49.98 })
  subtotal!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ type: ShippingAddressDto })
  shippingAddress!: ShippingAddressDto;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: PaymentInfoDto, nullable: true })
  payment!: PaymentInfoDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class OrderListPageDto {
  @ApiProperty({ type: [OrderDto] })
  items!: OrderDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}
