import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentsController } from './payments.controller';
import { MidtransPaymentProvider } from './providers/midtrans-payment.provider';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentsController],
  providers: [
    MockPaymentProvider,
    MidtransPaymentProvider,
    {
      // Pick the active gateway from config (default: mock). Both
      // implementations are instantiated; only the chosen one is bound to the
      // token services inject.
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, MockPaymentProvider, MidtransPaymentProvider],
      useFactory: (
        config: ConfigService,
        mock: MockPaymentProvider,
        midtrans: MidtransPaymentProvider,
      ) =>
        config.get<string>('PAYMENT_PROVIDER', 'mock') === 'midtrans'
          ? midtrans
          : mock,
    },
    PaymentService,
  ],
  exports: [PaymentService],
})
export class PaymentsModule {}
