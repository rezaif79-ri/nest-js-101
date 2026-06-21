import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/numeric.transformer';
import { Order } from '../../orders/entities/order.entity';

/** Payment lifecycle, independent of the order's fulfilment status. */
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

/**
 * One payment intent per order. Holds the provider-specific handles the
 * frontend needs to drive checkout (`snapToken`/`redirectUrl`) plus the last
 * raw gateway payload for auditing/debugging.
 */
@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  orderId!: string;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  // Which gateway produced this intent: 'mock' or 'midtrans'.
  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount!: number;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  // Gateway-issued client token (Midtrans Snap token) for the frontend SDK.
  @Column({ type: 'varchar', nullable: true })
  snapToken!: string | null;

  // Hosted payment page to redirect the buyer to.
  @Column({ type: 'varchar', nullable: true })
  redirectUrl!: string | null;

  // Gateway-side transaction id, once known.
  @Column({ type: 'varchar', nullable: true })
  externalId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  rawResponse!: unknown;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
