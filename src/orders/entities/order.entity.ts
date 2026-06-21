import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { numericTransformer } from '../../common/numeric.transformer';
import { OrderItem } from './order-item.entity';

/** Order lifecycle. Starts `pending`; payment flips it to `paid`. */
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/**
 * The shipping address is an opaque value object echoed back verbatim, so it is
 * stored as a single JSONB blob rather than spread across queryable columns.
 */
export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  /** ISO-3166 alpha-2. */
  country: string;
}

/**
 * A customer order. Prices are snapshotted onto the `OrderItem` rows at
 * placement time (the catalog can change later), and `subtotal` is the sum of
 * those line totals as computed server-side.
 */
@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Owning customer profile (not the user id) — every ownership check keys on
  // this. Indexed because order history filters by it.
  @Index()
  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  // Contact email captured at checkout (may differ from the account email).
  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'jsonb' })
  shippingAddress!: ShippingAddress;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  subtotal!: number;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
