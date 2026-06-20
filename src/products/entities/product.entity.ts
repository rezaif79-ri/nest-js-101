import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Seller } from '../../sellers/entities/seller.entity';

/**
 * Catalog product owned by a `Seller`. The `sellerId` FK references the
 * SELLER table id (not the user id), which is what every ownership check
 * is keyed on.
 */
@Entity('product')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  // Stored as numeric for currency precision. TypeORM returns numeric as a
  // string by default; a transformer keeps it a JS number on the way out.
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => (value === null ? null : parseFloat(value)),
    },
  })
  price!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'uuid' })
  sellerId!: string;

  @ManyToOne(() => Seller, (seller) => seller.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller!: Seller;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
