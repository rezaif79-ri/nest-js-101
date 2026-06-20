import { IsBoolean } from 'class-validator';

export class UpdateUserRoleDto {
  /** Whether the target user should have administrator access. */
  @IsBoolean()
  isAdmin!: boolean;
}
