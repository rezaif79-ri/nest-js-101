import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { Payment } from '../payments/entities/payment.entity';
import { CustomerOrdersController } from './customer-orders.controller';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    // Payment repo is registered here too so OrdersService can read payment
    // rows when serializing order history/detail.
    TypeOrmModule.forFeature([Order, OrderItem, Payment]),
    // Provides JwtAuthGuard for the customer order routes.
    AuthModule,
    // Provides PaymentService to open a payment intent at checkout.
    PaymentsModule,
  ],
  controllers: [CustomerOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
