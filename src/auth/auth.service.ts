import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { CustomersService } from '../customers/customers.service';
import { SellersService } from '../sellers/sellers.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthTokenResponse, LoginDto } from './dto/login.dto';
import { RegisterDto, RegisterResponse } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_ROUNDS = 12;
// Postgres unique_violation.
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
    private readonly sellersService: SellersService,
  ) {}

  /**
   * Hybrid start registration. Creates the `User` and its `Customer` profile
   * atomically: both rows commit together or neither does, so a failure can
   * never leave an orphaned user without a customer profile.
   */
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = manager.create(User, {
          email: dto.email,
          password: passwordHash,
        });
        const savedUser = await manager.save(user);

        const customer = await this.customersService.createForUser(
          manager,
          savedUser.id,
        );

        return {
          id: savedUser.id,
          email: savedUser.email,
          customerId: customer.id,
        };
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('An account with this email already exists.');
      }
      throw new InternalServerErrorException('Failed to register user.');
    }
  }

  /**
   * Verifies credentials and issues a JWT carrying both `customerId` and
   * `sellerId` (the latter null until the seller profile is activated).
   */
  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.issueToken(user.id, user.email);
  }

  /**
   * Builds a fresh token for a user by reading their current customer/seller
   * profiles. Shared by login and by seller activation (token refresh), so a
   * newly created `sellerId` is reflected immediately without re-login.
   */
  async issueToken(userId: string, email: string): Promise<AuthTokenResponse> {
    const [customer, seller] = await Promise.all([
      this.customersService.findByUserId(userId),
      this.sellersService.findByUserId(userId),
    ]);

    const payload: JwtPayload = {
      sub: userId,
      email,
      customerId: customer?.id ?? null,
      sellerId: seller?.id ?? null,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      customerId: payload.customerId,
      sellerId: payload.sellerId,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === PG_UNIQUE_VIOLATION
    );
  }
}
