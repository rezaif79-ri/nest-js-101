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

  // --- Personal profile (all optional; populated after registration) ---
  @Column({ type: 'varchar', length: 120, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  firstName!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  lastName!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  // Storage key for the avatar image (same convention as product images);
  // null when no avatar has been uploaded.
  @Column({ type: 'varchar', nullable: true })
  avatarObjectKey!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  locale!: string | null;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
