import 'server-only';

import { getPlan, isPlanCode } from '@/lib/billing/plans';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

export class BillingSyncError extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
  ) {
    super(message);
    this.name = 'BillingSyncError';
  }
}

export type SubscriptionWrite = {
  companyId: string;
  planCode: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type InvoiceWrite = {
  companyId: string | null;
  stripeInvoiceId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  currency: string;
  amountDuePaise: number;
  amountPaidPaise: number;
  hostedInvoiceUrl: string | null;
};

function assertDatabase() {
  if (!isSupabaseConfigured()) {
    throw new BillingSyncError('Database not configured', true);
  }
}

function permanent(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('23503') ||
    lower.includes('foreign key') ||
    lower.includes('invalid input syntax') ||
    lower.includes('22p02')
  );
}

function raise(error: { message: string }): never {
  if (permanent(error.message)) {
    throw new BillingSyncError(error.message, false);
  }
  throw new BillingSyncError(error.message, true);
}

async function ensurePlan(input: SubscriptionWrite): Promise<string | null> {
  if (!isPlanCode(input.planCode)) return null;
  const plan = getPlan(input.planCode);
  if (!plan) return null;

  const { data, error } = await supabaseAdmin
    .from('plans')
    .upsert(
      {
        company_id: input.companyId,
        code: plan.code,
        name: plan.name,
        currency: plan.currency,
        amount_paise: plan.amountPaise,
        billing_interval: plan.interval,
        stripe_price_id: input.stripePriceId,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,code' },
    )
    .select('id')
    .single();

  if (error || !data) raise(error ?? { message: 'Plan row was not saved' });
  return data.id as string;
}

export async function upsertSubscription(input: SubscriptionWrite): Promise<void> {
  assertDatabase();
  const planId = await ensurePlan(input);
  const { error } = await supabaseAdmin.from('subscriptions').upsert(
    {
      company_id: input.companyId,
      plan_id: planId,
      plan_code: input.planCode,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      stripe_price_id: input.stripePriceId,
      status: input.status,
      current_period_end: input.currentPeriodEnd,
      cancel_at_period_end: input.cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );
  if (error) raise(error);
}

async function subscriptionLink(stripeSubscriptionId: string | null) {
  if (!stripeSubscriptionId) return null;
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, company_id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();
  if (error) raise(error);
  return data as { id: string; company_id: string } | null;
}

export async function upsertInvoice(input: InvoiceWrite): Promise<void> {
  assertDatabase();
  if (!input.stripeSubscriptionId && !input.companyId) {
    throw new BillingSyncError('Invoice has no subscription', false);
  }

  const linked = await subscriptionLink(input.stripeSubscriptionId);
  const companyId = linked?.company_id ?? input.companyId;
  if (!companyId) {
    throw new BillingSyncError('Subscription not synced yet', true);
  }

  const { error } = await supabaseAdmin.from('invoices').upsert(
    {
      company_id: companyId,
      subscription_id: linked?.id ?? null,
      stripe_invoice_id: input.stripeInvoiceId,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      status: input.status,
      currency: input.currency.toUpperCase(),
      amount_due_paise: input.amountDuePaise,
      amount_paid_paise: input.amountPaidPaise,
      hosted_invoice_url: input.hostedInvoiceUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_invoice_id' },
  );
  if (error) raise(error);
}
