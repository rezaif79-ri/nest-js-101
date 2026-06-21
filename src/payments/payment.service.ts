import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import type {
  PaymentChargeInput,
  PaymentProvider,
} from './providers/payment-provider.interface';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Opens a payment intent for a freshly placed order and persists it. Called
   * after the order transaction commits so the gateway's (possibly remote) call
   * doesn't hold the product row locks. On provider failure the order remains
   * `pending` with no payment row — the buyer can retry.
   */
  async createForOrder(input: PaymentChargeInput): Promise<Payment | null> {
    try {
      const tx = await this.provider.createTransaction(input);
      const payment = this.paymentRepository.create({
        orderId: input.orderId,
        provider: this.provider.name,
        status: PaymentStatus.PENDING,
        amount: input.amount,
        currency: input.currency,
        snapToken: tx.snapToken,
        redirectUrl: tx.redirectUrl,
        externalId: tx.externalId,
        rawResponse: tx.raw,
      });
      return await this.paymentRepository.save(payment);
    } catch (err) {
      this.logger.error(
        `Failed to create payment for order ${input.orderId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Verifies and applies a gateway webhook. Idempotent: re-delivery of an
   * already-applied result is a no-op. Settlement flips the order to `paid`;
   * a denied/expired/cancelled result marks the payment `failed`.
   */
  async handleWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ): Promise<{ orderId: string; status: PaymentStatus }> {
    const result = await this.provider.verifyWebhook(payload, headers);

    const payment = await this.paymentRepository.findOne({
      where: { orderId: result.orderId },
    });
    if (!payment) {
      throw new NotFoundException(`No payment for order ${result.orderId}.`);
    }

    if (payment.status === PaymentStatus.PAID) {
      return { orderId: payment.orderId, status: payment.status };
    }

    if (result.paid) {
      await this.dataSource.transaction(async (manager) => {
        payment.status = PaymentStatus.PAID;
        payment.rawResponse = result.raw;
        await manager.save(payment);
        // Only advance from pending; never regress shipped/delivered.
        await manager.update(
          Order,
          { id: payment.orderId, status: OrderStatus.PENDING },
          { status: OrderStatus.PAID },
        );
      });
    } else if (result.failed) {
      payment.status = PaymentStatus.FAILED;
      payment.rawResponse = result.raw;
      await this.paymentRepository.save(payment);
    }

    return { orderId: payment.orderId, status: payment.status };
  }
}
