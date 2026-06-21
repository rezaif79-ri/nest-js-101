import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/numeric.transformer';
import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';

/**
 * A single line on an `Order`. `title` and `unitPrice` are snapshotted at
 * placement time so the order stays accurate even if the product is later
 * renamed, repriced, or deleted (`productId` becomes null on product delete).
 * `lineTotal` is derived (`unitPrice * quantity`), not stored.
 */
@Entity('order_item')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  // Nullable so deleting a product doesn't erase order history.
  @Column({ type: 'uuid', nullable: true })
  productId!: string | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productId' })
  product!: Product | null;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  unitPrice!: number;

  @Column({ type: 'int' })
  quantity!: number;
}
