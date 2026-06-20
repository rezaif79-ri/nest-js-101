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

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => Product, (product) => product.seller)
  products!: Product[];
}
