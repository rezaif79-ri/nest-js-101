import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Customer profile. Provisioned automatically inside the registration
 * transaction so every freshly registered user can immediately browse and
 * buy. Owns a unique FK back to its `User`.
 */
@Entity('customer')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Set at registration time (hybrid start: everyone is a customer first).
  @CreateDateColumn({ type: 'timestamptz' })
  registeredAt!: Date;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
