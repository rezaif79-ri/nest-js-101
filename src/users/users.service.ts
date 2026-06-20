import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../products/dto/pagination-query.dto';
import { User } from './entities/user.entity';

/** A page of results plus the cursor used to request the next page. */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

interface UserCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /** Like `findById`, but throws `NotFoundException` when the user is absent. */
  requireExisting(id: string): Promise<User> {
    return this.requireById(id);
  }

  /**
   * Loads a user together with the password hash (which is `select: false`
   * on the entity), for credential verification during login.
   */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.password')
      .getOne();
  }

  /** Admin listing: every user, newest first, keyset-paginated. */
  async findPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<User>> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      // Fetch one extra row to detect whether a further page exists.
      .take(query.limit + 1);

    const cursor = this.decodeCursor(query.cursor);
    if (cursor) {
      qb.where('(user.createdAt, user.id) < (:createdAt, :cursorId)', {
        createdAt: cursor.createdAt,
        cursorId: cursor.id,
      });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: hasMore && last ? this.encodeCursor(last) : null,
    };
  }

  /** Soft-deactivates a user (sets `isActive = false`). */
  async deactivate(id: string): Promise<User> {
    const user = await this.requireById(id);
    user.isActive = false;
    return this.userRepository.save(user);
  }

  /** Promotes/demotes a user's admin flag. */
  async setAdmin(id: string, isAdmin: boolean): Promise<User> {
    const user = await this.requireById(id);
    user.isAdmin = isAdmin;
    return this.userRepository.save(user);
  }

  private async requireById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found.`);
    }
    return user;
  }

  private encodeCursor(user: User): string {
    const payload: UserCursor = {
      createdAt: user.createdAt.toISOString(),
      id: user.id,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeCursor(raw?: string): UserCursor | null {
    if (!raw) {
      return null;
    }
    try {
      const decoded = Buffer.from(raw, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as UserCursor;
      if (!parsed.createdAt || !parsed.id) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
