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
import { Seller } from '../../sellers/entities/seller.entity';
import { Category } from './category.entity';
import { ProductImage } from './product-image.entity';

/** Lifecycle state. Only `active` products are exposed in the public catalog. */
export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

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

  // URL-/cache-key-friendly identifier, unique across the catalog. Derived
  // from the title at create time.
  @Column({ unique: true })
  slug!: string;

  // Short blurb for list/card views, so the catalog list need not ship the
  // full description body. Nullable until the seller fills it in.
  @Column({ type: 'varchar', length: 300, nullable: true })
  shortDescription!: string | null;

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

  // ISO 4217 currency code for `price`. Defaults to the store base currency.
  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  // Publishing state. New products start as draft (hidden from the public
  // catalog) until the seller explicitly publishes them.
  @Index()
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status!: ProductStatus;

  @Column({ type: 'uuid' })
  sellerId!: string;

  @ManyToOne(() => Seller, (seller) => seller.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller!: Seller;

  // Nullable: a product need not be categorised. SET NULL on category delete
  // keeps the product around. Indexed because the public catalog filters by it.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category!: Category | null;

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: false })
  images!: ProductImage[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
