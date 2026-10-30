import { isPlanCode, planCodeForPriceId } from '@/lib/billing/plans';
import type { InvoiceWrite, SubscriptionWrite } from '@/lib/billing/sync';

type IdRef = string | { id: string } | null | undefined;

export type SubscriptionEvent = {
  id: string;
  status: string;
  customer?: IdRef;
  cancel_at_period_end?: boolean | null;
  current_period_end?: number | null;
  metadata?: Record<string, string> | null;
  items?: {
    data?: Array<{
      current_period_end?: number | null;
      price?: { id?: string | null } | null;
    }>;
  } | null;
};

export type InvoiceEvent = {
  id: string;
  status?: string | null;
  customer?: IdRef;
  currency?: string | null;
  amount_due?: number | null;
  amount_paid?: number | null;
  hosted_invoice_url?: string | null;
  subscription?: IdRef;
  metadata?: Record<string, string> | null;
  parent?: {
    subscription_details?: {
      subscription?: IdRef;
      metadata?: Record<string, string> | null;
    } | null;
  } | null;
};

export type CheckoutSessionEvent = {
  mode?: string | null;
  customer?: IdRef;
  subscription?: IdRef;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
};

function idOf(value: IdRef): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function periodEndIso(subscription: SubscriptionEvent): string | null {
  const seconds =
    subscription.current_period_end ??
    subscription.items?.data?.[0]?.current_period_end ??
    null;
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

export function subscriptionWrite(
  subscription: SubscriptionEvent,
  fallback?: { companyId?: string | null; planCode?: string | null },
): SubscriptionWrite | null {
  const companyId = subscription.metadata?.company_id || fallback?.companyId || null;
  if (!companyId) return null;

  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const fromMetadata = subscription.metadata?.plan_code || fallback?.planCode || '';
  const planCode = isPlanCode(fromMetadata)
    ? fromMetadata
    : (planCodeForPriceId(priceId) ?? (fromMetadata || 'unlisted'));

  return {
    companyId,
    planCode,
    stripeCustomerId: idOf(subscription.customer),
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status: subscription.status,
    currentPeriodEnd: periodEndIso(subscription),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  };
}

export function invoiceSubscriptionId(invoice: InvoiceEvent): string | null {
  return (
    idOf(invoice.subscription) ??
    idOf(invoice.parent?.subscription_details?.subscription) ??
    null
  );
}

export function invoiceWrite(invoice: InvoiceEvent): InvoiceWrite {
  const details = invoice.parent?.subscription_details;
  const companyId = invoice.metadata?.company_id || details?.metadata?.company_id || null;
  const currency = (invoice.currency || 'inr').toUpperCase();
  return {
    companyId,
    stripeInvoiceId: invoice.id,
    stripeCustomerId: idOf(invoice.customer),
    stripeSubscriptionId: invoiceSubscriptionId(invoice),
    status: invoice.status || 'open',
    currency: currency.length === 3 ? currency : 'INR',
    amountDuePaise: Math.max(0, invoice.amount_due ?? 0),
    amountPaidPaise: Math.max(0, invoice.amount_paid ?? 0),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
  };
}

export function checkoutFallback(session: CheckoutSessionEvent) {
  return {
    companyId: session.metadata?.company_id || session.client_reference_id || null,
    planCode: session.metadata?.plan_code || null,
    subscriptionId: idOf(session.subscription),
  };
}
