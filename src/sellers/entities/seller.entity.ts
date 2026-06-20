import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

/**
 * Seller profile. Created lazily when a user activates their shop, so the
 * `seller` row (and therefore `sellerId`) does not exist until activation.
 * Owns a unique FK back to its `User`.
 */
@Entity('seller')
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Stamped the moment the user activates their seller profile.
  @CreateDateColumn({ type: 'timestamptz' })
  registeredAt!: Date;

  // --- Personal profile (mirrors Customer; all optional) ---
  @Column({ type: 'varchar', length: 120, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  firstName!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  lastName!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarObjectKey!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  locale!: string | null;

  // --- Storefront (seller-specific) ---
  @Column({ type: 'varchar', length: 120, nullable: true, unique: true })
  shopName!: string | null;

  @Column({ type: 'varchar', length: 140, nullable: true, unique: true })
  shopSlug!: string | null;

  @Column({ type: 'text', nullable: true })
  shopDescription!: string | null;

  @Column({ type: 'varchar', nullable: true })
  shopLogoObjectKey!: string | null;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => Product, (product) => product.seller)
  products!: Product[];
}
