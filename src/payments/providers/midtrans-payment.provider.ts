import { createHash } from 'crypto';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asString } from '../../common/coerce';
import {
  PaymentChargeInput,
  PaymentProvider,
  PaymentTransaction,
  WebhookResult,
} from './payment-provider.interface';

const PAID_STATUSES = ['settlement', 'capture'];
const FAILED_STATUSES = ['deny', 'cancel', 'expire', 'failure'];

/** Minimal shape of the parts of `midtrans-client` we use. */
interface MidtransSnap {
  createTransaction(params: Record<string, unknown>): Promise<{
    token?: string;
    redirect_url?: string;
  }>;
}
interface MidtransClientModule {
  Snap: new (opts: {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }) => MidtransSnap;
}

/**
 * Real Midtrans Snap integration (sandbox by default). `midtrans-client` is
 * required lazily so the dependency is only loaded when this provider is
 * actually selected (`PAYMENT_PROVIDER=midtrans`) — the mock path never needs
 * it. Webhooks are authenticated by recomputing Midtrans' SHA-512
 * `signature_key`.
 *
 * Note: Midtrans expects an integer `gross_amount` (sandbox is IDR-oriented),
 * so the order amount is rounded. For production a real currency/amount mapping
 * would be needed; this is sufficient for a sandbox demo.
 */
@Injectable()
export class MidtransPaymentProvider implements PaymentProvider {
  readonly name = 'midtrans';
  private readonly serverKey: string;
  private readonly clientKey: string;
  private readonly isProduction: boolean;
  private snap: MidtransSnap | null = null;

  constructor(config: ConfigService) {
    this.serverKey = config.get<string>('MIDTRANS_SERVER_KEY', '');
    this.clientKey = config.get<string>('MIDTRANS_CLIENT_KEY', '');
    this.isProduction = config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';
  }

  private getSnap(): MidtransSnap {
    if (this.snap) {
      return this.snap;
    }
    let Midtrans: MidtransClientModule;
    try {
      // Lazy require: only loaded when this provider is selected.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Midtrans = require('midtrans-client') as MidtransClientModule;
    } catch {
      throw new InternalServerErrorException(
        'midtrans-client is not installed. Run `npm i midtrans-client` or set PAYMENT_PROVIDER=mock.',
      );
    }
    this.snap = new Midtrans.Snap({
      isProduction: this.isProduction,
      serverKey: this.serverKey,
      clientKey: this.clientKey,
    });
    return this.snap;
  }

  async createTransaction(
    input: PaymentChargeInput,
  ): Promise<PaymentTransaction> {
    const grossAmount = Math.round(input.amount);
    const response = await this.getSnap().createTransaction({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: grossAmount,
      },
      item_details: input.items.map((item, i) => ({
        id: `item_${i}`,
        name: item.title.slice(0, 50),
        price: Math.round(item.unitPrice),
        quantity: item.quantity,
      })),
      customer_details: { email: input.email },
    });

    return {
      snapToken: response.token ?? null,
      redirectUrl: response.redirect_url ?? null,
      externalId: input.orderId,
      raw: response,
    };
  }

  verifyWebhook(payload: Record<string, unknown>): Promise<WebhookResult> {
    const orderId = asString(payload.order_id);
    const statusCode = asString(payload.status_code);
    const grossAmount = asString(payload.gross_amount);
    const signature = asString(payload.signature_key);

    const expected = createHash('sha512')
      .update(orderId + statusCode + grossAmount + this.serverKey)
      .digest('hex');
    if (signature !== expected) {
      throw new UnauthorizedException('Invalid Midtrans signature.');
    }

    const transactionStatus = asString(
      payload.transaction_status,
    ).toLowerCase();
    const fraudStatus = asString(payload.fraud_status).toLowerCase();
    const paid =
      transactionStatus === 'settlement' ||
      (transactionStatus === 'capture' && fraudStatus !== 'challenge');

    return Promise.resolve({
      orderId,
      paid: paid && PAID_STATUSES.includes(transactionStatus),
      failed: FAILED_STATUSES.includes(transactionStatus),
      raw: payload,
    });
  }
}
