import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Seller } from '../../sellers/entities/seller.entity';

/**
 * Centralized identity table. Every actor in the system has exactly one
 * `User` row; their role-specific data lives in the `Customer` / `Seller`
 * tables which point back here.
 */
@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  // `select: false` keeps the hash out of normal queries; it must be
  // explicitly requested (e.g. via addSelect) when authenticating.
  @Column({ select: false })
  password!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => Customer, (customer) => customer.user)
  customer!: Customer;

  @OneToOne(() => Seller, (seller) => seller.user)
  seller!: Seller;
}
