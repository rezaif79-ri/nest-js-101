import { User } from '../entities/user.entity';

/**
 * Safe, outward-facing view of a `User`. Never exposes the password hash;
 * built explicitly so new entity columns are not leaked by accident.
 */
export class UserResponseDto {
  id!: string;
  email!: string;
  isAdmin!: boolean;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.isAdmin = user.isAdmin;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
