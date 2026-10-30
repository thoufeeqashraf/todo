import { getPlan, isPlanCode, listPlans, type PlanCode } from '@/lib/billing/plans';

export type BillingReadState = 'ready' | 'missing' | 'unavailable';

export type CheckoutAction = 'subscribe' | 'upgrade' | 'current';

export type BillingPlanView = {
  code: PlanCode;
  name: string;
  description: string;
  priceLabel: string;
  points: readonly string[];
  featured: boolean;
  action: CheckoutAction;
};

export type SubscriptionDraft = {
  planCode: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
};

export type BillingSubscriptionView = {
  planCode: string;
  planName: string;
  priceLabel: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  periodLabel: string | null;
};

export type BillingInvoiceView = {
  id: string;
  number: string;
  status: string;
  amountLabel: string;
  whenLabel: string;
  hostedInvoiceUrl: string | null;
};

const PLAN_POINTS: Record<PlanCode, readonly string[]> = {
  starter: ['One company workspace', 'Tasks and staff', 'Customer web for this company'],
  growth: ['Multiple sites', 'Managers and the modules you turn on', 'Usage counted on this page'],
  scale: ['Higher limits for multi-site companies', 'The same admin checkout', 'Invoices stored from Stripe'],
};

const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

const STATUS_RANK: Record<string, number> = {
  active: 0,
  trialing: 1,
  past_due: 2,
  unpaid: 3,
  paused: 4,
  incomplete: 5,
  canceled: 6,
  cancelled: 6,
  incomplete_expired: 7,
};

const PLAN_RANK: Record<PlanCode, number> = {
  starter: 0,
  growth: 1,
  scale: 2,
};

export function isMissingBillingRelation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: unknown; message?: unknown; details?: unknown };
  const code = typeof record.code === 'string' ? record.code : '';
  const message = `${typeof record.message === 'string' ? record.message : ''} ${
    typeof record.details === 'string' ? record.details : ''
  }`.toLowerCase();
  if (code === '42P01' || code === '42703' || code === 'PGRST205' || code === 'PGRST204') return true;
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('could not find the relation')
  );
}

export function isLiveSubscription(status: string): boolean {
  return LIVE_STATUSES.has(status.toLowerCase());
}

export function pickSubscription(rows: readonly SubscriptionDraft[]): SubscriptionDraft | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const rankA = STATUS_RANK[a.status.toLowerCase()] ?? 50;
    const rankB = STATUS_RANK[b.status.toLowerCase()] ?? 50;
    if (rankA !== rankB) return rankA - rankB;
    return b.updatedAt.localeCompare(a.updatedAt);
  })[0] ?? null;
}

export function checkoutAction(
  plan: PlanCode,
  subscription: { planCode: string; status: string } | null,
): CheckoutAction {
  if (!subscription || !isLiveSubscription(subscription.status) || !isPlanCode(subscription.planCode)) {
    return 'subscribe';
  }
  if (subscription.planCode === plan) return 'current';
  return PLAN_RANK[plan] > PLAN_RANK[subscription.planCode] ? 'upgrade' : 'subscribe';
}

export function checkoutLabel(action: CheckoutAction): string {
  if (action === 'upgrade') return 'Upgrade';
  if (action === 'current') return 'Current plan';
  return 'Subscribe';
}

export function buildPlanViews(subscription: { planCode: string; status: string } | null): BillingPlanView[] {
  return listPlans().map((plan) => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    priceLabel: formatPaise(plan.amountPaise, plan.currency),
    points: PLAN_POINTS[plan.code],
    featured: plan.code === 'growth',
    action: checkoutAction(plan.code, subscription),
  }));
}

export function toSubscriptionView(draft: SubscriptionDraft): BillingSubscriptionView {
  const plan = isPlanCode(draft.planCode) ? getPlan(draft.planCode) : undefined;
  return {
    planCode: draft.planCode,
    planName: plan?.name ?? draft.planCode,
    priceLabel: plan ? `${formatPaise(plan.amountPaise, plan.currency)} / month` : null,
    status: draft.status,
    cancelAtPeriodEnd: draft.cancelAtPeriodEnd,
    periodLabel: periodLabel(draft),
  };
}

export function periodLabel(subscription: {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}): string | null {
  const when = formatBillingWhen(subscription.currentPeriodEnd);
  if (when === '—') return null;
  if (subscription.cancelAtPeriodEnd) return `Ends ${when}`;
  if (isLiveSubscription(subscription.status)) return `Renews ${when}`;
  return `Period ended ${when}`;
}

export function invoiceAmountPaise(invoice: {
  status: string;
  amountDuePaise: number;
  amountPaidPaise: number;
}): number {
  if (invoice.status.toLowerCase() === 'paid') return invoice.amountPaidPaise;
  if (invoice.amountDuePaise > 0) return invoice.amountDuePaise;
  return invoice.amountPaidPaise;
}

export function formatPaise(paise: number, currency = 'INR'): string {
  const normalized = currency.trim().toUpperCase();
  const code = /^[A-Z]{3}$/.test(normalized) ? normalized : 'INR';
  const amount = paise / 100;
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(whole ? 0 : 2)}`;
  }
}

export function formatBillingWhen(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hourCycle: 'h23',
  }).format(date);
  return `${formatted} UTC`;
}

export function statusLabel(status: string): string {
  const cleaned = status.trim().replaceAll('_', ' ');
  if (!cleaned) return 'Unknown';
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const value = status.toLowerCase();
  if (value === 'active' || value === 'paid' || value === 'trialing') return 'default';
  if (value === 'past_due' || value === 'unpaid' || value === 'uncollectible') return 'destructive';
  if (value === 'canceled' || value === 'cancelled' || value === 'void' || value === 'incomplete_expired') {
    return 'outline';
  }
  return 'secondary';
}

export function readApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const error = (payload as { error?: unknown }).error;
  return typeof error === 'string' && error.trim() ? error : null;
}

export function stripeCheckoutUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function safeHttps(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
