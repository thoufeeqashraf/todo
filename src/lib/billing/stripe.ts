import 'server-only';

import Stripe from 'stripe';

export class BillingNotConfiguredError extends Error {
  constructor() {
    super('Billing not configured');
    this.name = 'BillingNotConfiguredError';
  }
}

function readSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  const marker = value.toLowerCase();
  if (
    marker.includes('placeholder') ||
    marker.includes('your_stripe') ||
    marker.includes('whsec_your') ||
    marker.includes('sk_test_your') ||
    marker.includes('sk_live_your')
  ) {
    return undefined;
  }
  return value;
}

/** Secret key, read on use so a build with no env still loads this module. */
export function stripeSecretKey(): string | undefined {
  return readSecret('STRIPE_SECRET_KEY');
}

/** Webhook signing secret, read on use so a build with no env still loads this module. */
export function stripeWebhookSecret(): string | undefined {
  return readSecret('STRIPE_WEBHOOK_SECRET');
}

export function isBillingConfigured(): boolean {
  return Boolean(stripeSecretKey() && stripeWebhookSecret());
}

let cached: { key: string; client: Stripe } | null = null;

export function getStripe(): Stripe {
  const key = stripeSecretKey();
  if (!key) throw new BillingNotConfiguredError();
  if (!cached || cached.key !== key) {
    cached = { key, client: new Stripe(key) };
  }
  return cached.client;
}

export function constructBillingEvent(payload: string, signature: string): Stripe.Event {
  const secret = stripeWebhookSecret();
  if (!secret) throw new BillingNotConfiguredError();
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}
