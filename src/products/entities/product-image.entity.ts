import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

/**
 * A single image belonging to a `Product`. We persist only the storage
 * `objectKey` (e.g. `products/{productId}/{uuid}.webp`) — never a full URL — so
 * the bucket/CDN host can change without a data migration. Public URLs are
 * derived at read time.
 */
@Entity('product_image')
@Index(['productId', 'position'])
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  // Storage key within the bucket. Unique so we never index the same object
  // twice.
  @Column({ unique: true })
  objectKey!: string;

  // Gallery ordering; position 0 is the primary/thumbnail image.
  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column({ type: 'varchar', length: 300, nullable: true })
  altText!: string | null;

  @Column({ type: 'int', nullable: true })
  width!: number | null;

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Column({ type: 'int', nullable: true })
  sizeBytes!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contentType!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
