-- Company subscription billing. Tenant rows are keyed by company_id.
-- The Starter / Growth / Scale catalogue lives in src/lib/billing/plans.ts.
-- A plan row is the company's copy of a catalogue plan (price snapshot + Stripe price id).
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  billing_interval VARCHAR(20) NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_code VARCHAR(50) NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT,
  status VARCHAR(50) NOT NULL,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stripe_subscription_id)
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status VARCHAR(50) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  amount_due_paise INTEGER NOT NULL DEFAULT 0 CHECK (amount_due_paise >= 0),
  amount_paid_paise INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_paise >= 0),
  hosted_invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stripe_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_plans_company_id ON public.plans(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_subscription ON public.invoices(stripe_subscription_id);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Anon has no billing access. Service role bypasses RLS and is what the server uses.
-- Restrictive policies stay in force even if a later permissive policy is added.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    RAISE NOTICE 'anon role is missing; skip billing anon revoke and policies';
    RETURN;
  END IF;

  EXECUTE 'REVOKE ALL ON TABLE public.plans FROM anon';
  EXECUTE 'REVOKE ALL ON TABLE public.subscriptions FROM anon';
  EXECUTE 'REVOKE ALL ON TABLE public.invoices FROM anon';

  EXECUTE 'DROP POLICY IF EXISTS billing_plans_deny_anon ON public.plans';
  EXECUTE 'CREATE POLICY billing_plans_deny_anon ON public.plans AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)';

  EXECUTE 'DROP POLICY IF EXISTS billing_subscriptions_deny_anon ON public.subscriptions';
  EXECUTE 'CREATE POLICY billing_subscriptions_deny_anon ON public.subscriptions AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)';

  EXECUTE 'DROP POLICY IF EXISTS billing_invoices_deny_anon ON public.invoices';
  EXECUTE 'CREATE POLICY billing_invoices_deny_anon ON public.invoices AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)';
END $$;

NOTIFY pgrst, 'reload schema';
