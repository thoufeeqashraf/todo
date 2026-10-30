export const PLAN_CODES = ['starter', 'growth', 'scale'] as const;

export type PlanCode = (typeof PLAN_CODES)[number];

export type BillingPlan = {
  code: PlanCode;
  name: string;
  description: string;
  currency: 'INR';
  amountPaise: number;
  interval: 'month';
  priceEnv: 'STRIPE_PRICE_STARTER' | 'STRIPE_PRICE_GROWTH' | 'STRIPE_PRICE_SCALE';
};

const CATALOGUE: readonly BillingPlan[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'One company, core tasks, and the customer web.',
    currency: 'INR',
    amountPaise: 149_900,
    interval: 'month',
    priceEnv: 'STRIPE_PRICE_STARTER',
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'Multiple sites, managers, and the modules a growing team turns on.',
    currency: 'INR',
    amountPaise: 499_900,
    interval: 'month',
    priceEnv: 'STRIPE_PRICE_GROWTH',
  },
  {
    code: 'scale',
    name: 'Scale',
    description: 'Higher limits for multi-site companies.',
    currency: 'INR',
    amountPaise: 1_499_900,
    interval: 'month',
    priceEnv: 'STRIPE_PRICE_SCALE',
  },
];

export function isPlanCode(value: string): value is PlanCode {
  return (PLAN_CODES as readonly string[]).includes(value);
}

export function listPlans(): readonly BillingPlan[] {
  return CATALOGUE;
}

export function getPlan(code: string): BillingPlan | undefined {
  return CATALOGUE.find((plan) => plan.code === code);
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  const marker = value.toLowerCase();
  if (marker.includes('placeholder') || marker.includes('your_stripe') || marker.includes('price_your')) {
    return undefined;
  }
  return value;
}

/** Stripe Price id for a catalogue plan. Read when called, not at import. */
export function stripePriceId(plan: BillingPlan): string | undefined {
  return readEnv(plan.priceEnv);
}

export function planCodeForPriceId(priceId: string | null | undefined): PlanCode | undefined {
  if (!priceId) return undefined;
  return CATALOGUE.find((plan) => stripePriceId(plan) === priceId)?.code;
}
