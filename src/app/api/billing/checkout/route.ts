import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getPlan, isPlanCode, stripePriceId } from '@/lib/billing/plans';
import { BillingNotConfiguredError, getStripe, isBillingConfigured } from '@/lib/billing/stripe';
import { requireCustomerSession } from '@/lib/customer-session';

const bodySchema = z.object({
  plan: z.string(),
});

function notConfigured() {
  return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireCustomerSession();
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage billing' }, { status: 403 });
    }

    if (!isBillingConfigured()) return notConfigured();

    const json: unknown = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success || !isPlanCode(parsed.data.plan)) {
      return NextResponse.json({ error: 'Choose Starter, Growth, or Scale' }, { status: 400 });
    }

    const plan = getPlan(parsed.data.plan);
    const priceId = plan ? stripePriceId(plan) : undefined;
    if (!plan || !priceId) return notConfigured();

    const origin = request.nextUrl.origin;
    const checkout = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer_email: session.user.email,
      client_reference_id: session.companyId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/customer/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/customer/billing?checkout=cancelled`,
      metadata: {
        company_id: session.companyId,
        plan_code: plan.code,
      },
      subscription_data: {
        metadata: {
          company_id: session.companyId,
          plan_code: plan.code,
        },
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ error: 'Checkout session has no URL' }, { status: 502 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) return notConfigured();
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.error('Billing checkout error:', error);
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 });
  }
}
