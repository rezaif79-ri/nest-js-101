import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { CustomersService } from './customers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    // forwardRef breaks the Auth <-> Customers cycle: AuthModule imports
    // CustomersModule for registration, while the profile routes here need
    // AuthModule's JwtAuthGuard.
    forwardRef(() => AuthModule),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService, TypeOrmModule],
})
export class CustomersModule {}
