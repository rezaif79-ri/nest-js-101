/** DI token for the active payment provider (mock or midtrans). */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

/** What a provider needs to open a transaction for an order. */
export interface PaymentChargeInput {
  orderId: string;
  amount: number;
  currency: string;
  email: string;
  items: { title: string; unitPrice: number; quantity: number }[];
}

/** Provider handles the frontend uses to drive checkout. */
export interface PaymentTransaction {
  snapToken: string | null;
  redirectUrl: string | null;
  externalId: string | null;
  raw: unknown;
}

/** Normalized outcome of a verified gateway webhook. */
export interface WebhookResult {
  orderId: string;
  /** Settled — the order should move to `paid`. */
  paid: boolean;
  /** Denied/expired/cancelled — the payment should move to `failed`. */
  failed: boolean;
  raw: unknown;
}

/**
 * A payment gateway behind a stable interface. Swapping providers (mock ↔
 * Midtrans) is a config change; nothing in orders/payments code changes.
 */
export interface PaymentProvider {
  readonly name: string;
  createTransaction(input: PaymentChargeInput): Promise<PaymentTransaction>;
  /** Verify authenticity and normalize a webhook payload. Throws if invalid. */
  verifyWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ): Promise<WebhookResult>;
}
