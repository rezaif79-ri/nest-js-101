import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CustomersModule } from '../customers/customers.module';
import { SellersModule } from '../sellers/sellers.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SellerGuard } from './guards/seller.guard';

@Module({
  imports: [
    // forwardRef breaks the Auth <-> Users cycle (UsersModule imports
    // AuthModule for its guards).
    forwardRef(() => UsersModule),
    CustomersModule,
    // forwardRef breaks the Auth <-> Sellers cycle: AuthService reads seller
    // profiles, while the seller-activation flow refreshes its token here.
    forwardRef(() => SellersModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // Cast: config yields a plain string, while jsonwebtoken types
          // expiresIn as the stricter `ms.StringValue | number`.
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '1d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, SellerGuard, AdminGuard],
  // Export guards + JwtModule so feature modules can protect their routes.
  exports: [AuthService, JwtAuthGuard, SellerGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
