import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CatalogCacheService } from '../cache/catalog-cache.service';
import { PaginationQueryDto } from '../products/dto/pagination-query.dto';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentService } from '../payments/payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderDto,
  OrderItemDto,
  PaymentInfoDto,
} from './dto/order-response.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus, ShippingAddress } from './entities/order.entity';

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

interface Cursor {
  createdAt: string;
  id: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly cache: CatalogCacheService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Place an order: re-price from the catalog, reserve stock, and open a
   * payment intent. The pricing/stock work runs in a serializable-by-locking
   * transaction (each product row is locked FOR UPDATE) so concurrent
   * checkouts can't oversell. The payment intent is created after commit to
   * avoid holding row locks across a (possibly remote) gateway call.
   */
  async place(customerId: string, dto: CreateOrderDto): Promise<OrderDto> {
    // Merge duplicate product lines so stock is checked/decremented once.
    const wanted = new Map<string, number>();
    for (const item of dto.items) {
      wanted.set(
        item.productId,
        (wanted.get(item.productId) ?? 0) + item.quantity,
      );
    }
    const productIds = [...wanted.keys()];

    const order = await this.dataSource.transaction(async (manager) => {
      const products = await manager
        .createQueryBuilder(Product, 'p')
        .setLock('pessimistic_write')
        .where('p.id IN (:...ids)', { ids: productIds })
        .getMany();
      const byId = new Map(products.map((p) => [p.id, p]));

      let currency: string | null = null;
      const orderItems: OrderItem[] = [];

      for (const [productId, quantity] of wanted) {
        const product = byId.get(productId);
        if (!product || product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(
            `Product ${productId} is not available for purchase.`,
          );
        }
        if (quantity > product.stock) {
          throw new ConflictException(
            `Insufficient stock for "${product.title}": requested ${quantity}, available ${product.stock}.`,
          );
        }
        if (currency && product.currency !== currency) {
          throw new BadRequestException(
            'All items in an order must share the same currency.',
          );
        }
        currency = product.currency;

        // Safe under the row lock: no concurrent checkout can read this stock
        // until we commit.
        product.stock -= quantity;
        await manager.save(Product, product);

        orderItems.push(
          manager.create(OrderItem, {
            productId,
            title: product.title,
            unitPrice: product.price,
            quantity,
          }),
        );
      }

      const subtotal = round2(
        orderItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
      );

      const newOrder = manager.create(Order, {
        customerId,
        status: OrderStatus.PENDING,
        email: dto.email,
        shippingAddress: this.normalizeAddress(dto.shippingAddress),
        subtotal,
        currency: currency ?? 'USD',
        items: orderItems,
      });
      return manager.save(newOrder);
    });

    // Stock changed → product detail + every list page are stale.
    await Promise.all(productIds.map((id) => this.cache.invalidateProduct(id)));

    const payment = await this.paymentService.createForOrder({
      orderId: order.id,
      amount: order.subtotal,
      currency: order.currency,
      email: order.email,
      items: order.items.map((it) => ({
        title: it.title,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })),
    });

    return this.serialize(order, payment);
  }

  /** Order history for the caller, newest first, keyset-paginated. */
  async findForCustomer(
    customerId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<OrderDto>> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .where('order.customerId = :customerId', { customerId })
      .orderBy('order.createdAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .take(query.limit + 1);

    const cursor = this.decodeCursor(query.cursor);
    if (cursor) {
      qb.andWhere('(order.createdAt, order.id) < (:createdAt, :cursorId)', {
        createdAt: cursor.createdAt,
        cursorId: cursor.id,
      });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > query.limit;
    const orders = hasMore ? rows.slice(0, query.limit) : rows;
    const last = orders[orders.length - 1];

    const payments = await this.paymentsByOrderId(orders.map((o) => o.id));
    return {
      items: orders.map((o) => this.serialize(o, payments.get(o.id) ?? null)),
      nextCursor: hasMore && last ? this.encodeCursor(last) : null,
    };
  }

  /** Single order, scoped to the caller; 404 if not theirs. */
  async findOneForCustomer(customerId: string, id: string): Promise<OrderDto> {
    const order = await this.orderRepository.findOne({
      where: { id, customerId },
      relations: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found.`);
    }
    const payment = await this.paymentRepository.findOne({
      where: { orderId: id },
    });
    return this.serialize(order, payment);
  }

  private async paymentsByOrderId(
    orderIds: string[],
  ): Promise<Map<string, Payment>> {
    if (orderIds.length === 0) {
      return new Map();
    }
    const payments = await this.paymentRepository.find({
      where: { orderId: In(orderIds) },
    });
    return new Map(payments.map((p) => [p.orderId, p]));
  }

  private normalizeAddress(
    input: CreateOrderDto['shippingAddress'],
  ): ShippingAddress {
    return {
      fullName: input.fullName,
      line1: input.line1,
      line2: input.line2 ?? null,
      city: input.city,
      postalCode: input.postalCode,
      country: input.country,
    };
  }

  private serialize(order: Order, payment: Payment | null): OrderDto {
    const items: OrderItemDto[] = (order.items ?? []).map((it) => ({
      productId: it.productId,
      title: it.title,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      lineTotal: round2(it.unitPrice * it.quantity),
    }));

    const paymentInfo: PaymentInfoDto | null = payment
      ? {
          provider: payment.provider,
          status: payment.status,
          snapToken: payment.snapToken,
          redirectUrl: payment.redirectUrl,
        }
      : null;

    return {
      id: order.id,
      status: order.status,
      items,
      subtotal: order.subtotal,
      currency: order.currency,
      shippingAddress: order.shippingAddress,
      email: order.email,
      payment: paymentInfo,
      createdAt: order.createdAt.toISOString(),
    };
  }

  private encodeCursor(order: Order): string {
    const payload: Cursor = {
      createdAt: order.createdAt.toISOString(),
      id: order.id,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeCursor(raw?: string): Cursor | null {
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(
        Buffer.from(raw, 'base64url').toString('utf8'),
      ) as Cursor;
      return parsed.createdAt && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  }
}
