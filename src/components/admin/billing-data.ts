import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';

import {
  formatBillingWhen,
  formatPaise,
  invoiceAmountPaise,
  isMissingBillingRelation,
  pickSubscription,
  safeHttps,
  toSubscriptionView,
  type BillingInvoiceView,
  type BillingReadState,
  type BillingSubscriptionView,
  type SubscriptionDraft,
} from './billing-format';
import { asRecord, asText } from './format';

export type BillingRecords = {
  subscription: BillingSubscriptionView | null;
  subscriptionState: BillingReadState;
  invoices: BillingInvoiceView[];
  invoicesState: BillingReadState;
};

const EMPTY: BillingRecords = {
  subscription: null,
  subscriptionState: 'unavailable',
  invoices: [],
  invoicesState: 'unavailable',
};

function readState(error: unknown): BillingReadState {
  if (!error) return 'ready';
  return isMissingBillingRelation(error) ? 'missing' : 'unavailable';
}

function asInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Math.max(0, Math.round(Number(value)));
  }
  return 0;
}

function parseSubscription(value: unknown): SubscriptionDraft | null {
  const row = asRecord(value);
  if (!row) return null;
  const planCode = asText(row.plan_code);
  const status = asText(row.status);
  if (!planCode || !status) return null;
  return {
    planCode,
    status,
    currentPeriodEnd: asText(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
    updatedAt: asText(row.updated_at) ?? '',
  };
}

function parseInvoice(value: unknown): BillingInvoiceView | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asText(row.id);
  const number = asText(row.stripe_invoice_id);
  const status = asText(row.status);
  if (!id || !number || !status) return null;
  const currency = (asText(row.currency) ?? 'INR').toUpperCase();
  const amountDuePaise = asInt(row.amount_due_paise);
  const amountPaidPaise = asInt(row.amount_paid_paise);
  return {
    id,
    number,
    status,
    amountLabel: formatPaise(invoiceAmountPaise({ status, amountDuePaise, amountPaidPaise }), currency),
    whenLabel: formatBillingWhen(asText(row.created_at)),
    hostedInvoiceUrl: safeHttps(asText(row.hosted_invoice_url)),
  };
}

export async function loadBillingRecords(companyId: string): Promise<BillingRecords> {
  try {
    const [subscriptionsResult, invoicesResult] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('plan_code, status, current_period_end, cancel_at_period_end, updated_at')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('invoices')
        .select('id, stripe_invoice_id, status, currency, amount_due_paise, amount_paid_paise, hosted_invoice_url, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const subscriptionState = readState(subscriptionsResult.error);
    const invoicesState = readState(invoicesResult.error);
    if (subscriptionState === 'unavailable' && subscriptionsResult.error) console.error(subscriptionsResult.error);
    if (invoicesState === 'unavailable' && invoicesResult.error) console.error(invoicesResult.error);

    const drafts =
      subscriptionState === 'ready'
        ? (subscriptionsResult.data ?? []).map(parseSubscription).filter((row): row is SubscriptionDraft => row !== null)
        : [];
    const picked = pickSubscription(drafts);

    return {
      subscription: picked ? toSubscriptionView(picked) : null,
      subscriptionState,
      invoices:
        invoicesState === 'ready'
          ? (invoicesResult.data ?? []).map(parseInvoice).filter((row): row is BillingInvoiceView => row !== null)
          : [],
      invoicesState,
    };
  } catch (error) {
    console.error(error);
    return EMPTY;
  }
}
