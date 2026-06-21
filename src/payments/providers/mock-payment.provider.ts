import { randomUUID } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asString } from '../../common/coerce';
import {
  PaymentChargeInput,
  PaymentProvider,
  PaymentTransaction,
  WebhookResult,
} from './payment-provider.interface';

const PAID_STATUSES = ['settlement', 'capture', 'paid'];
const FAILED_STATUSES = ['deny', 'cancel', 'expire', 'failure'];

/**
 * Offline payment gateway for local/dev. Issues a fake Snap token and a
 * redirect to a simulate page; settlement is driven by POSTing to the webhook
 * with `{ orderId, transactionStatus }` and the shared-secret header. Shaped
 * like Midtrans so the frontend flow is identical to the real thing.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private readonly secret: string;
  private readonly appUrl: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('MOCK_PAYMENT_SECRET', 'mock-secret');
    this.appUrl = config.get<string>('APP_PUBLIC_URL', 'http://localhost:3000');
  }

  createTransaction(input: PaymentChargeInput): Promise<PaymentTransaction> {
    const snapToken = randomUUID();
    return Promise.resolve({
      snapToken,
      redirectUrl: `${this.appUrl}/payments/mock/${input.orderId}?token=${snapToken}`,
      externalId: `mock_${input.orderId}`,
      raw: { simulated: true },
    });
  }

  verifyWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ): Promise<WebhookResult> {
    const signature = headers['x-mock-signature'];
    if (signature !== this.secret) {
      throw new UnauthorizedException('Invalid mock payment signature.');
    }

    const orderId = asString(payload.orderId);
    const status = asString(payload.transactionStatus).toLowerCase();
    if (!orderId) {
      throw new UnauthorizedException('Missing orderId in webhook payload.');
    }

    return Promise.resolve({
      orderId,
      paid: PAID_STATUSES.includes(status),
      failed: FAILED_STATUSES.includes(status),
      raw: payload,
    });
  }
}
