import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPlanViews,
  checkoutAction,
  formatPaise,
  invoiceAmountPaise,
  isMissingBillingRelation,
  pickSubscription,
  readApiError,
  stripeCheckoutUrl,
  toSubscriptionView,
} from './billing-format.ts';

describe('billing screen formatting', () => {
  it('treats a missing subscriptions or invoices table as empty, not a crash', () => {
    assert.equal(isMissingBillingRelation({ code: '42P01', message: 'relation "subscriptions" does not exist' }), true);
    assert.equal(
      isMissingBillingRelation({
        code: 'PGRST205',
        message: "Could not find the table 'public.invoices' in the schema cache",
      }),
      true,
    );
    assert.equal(isMissingBillingRelation({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }), false);
    assert.equal(isMissingBillingRelation(null), false);
  });

  it('prefers a live subscription over a newer canceled row', () => {
    const picked = pickSubscription([
      {
        planCode: 'scale',
        status: 'canceled',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        updatedAt: '2026-10-30T12:00:00.000Z',
      },
      {
        planCode: 'growth',
        status: 'active',
        currentPeriodEnd: '2026-11-30T00:00:00.000Z',
        cancelAtPeriodEnd: false,
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
    assert.ok(picked);
    assert.equal(picked.planCode, 'growth');
    assert.equal(toSubscriptionView(picked).planName, 'Growth');
  });

  it('labels subscribe, upgrade, and the current plan', () => {
    assert.equal(checkoutAction('starter', null), 'subscribe');
    assert.equal(checkoutAction('growth', { planCode: 'starter', status: 'active' }), 'upgrade');
    assert.equal(checkoutAction('starter', { planCode: 'growth', status: 'active' }), 'subscribe');
    assert.equal(checkoutAction('growth', { planCode: 'growth', status: 'past_due' }), 'current');
    assert.equal(checkoutAction('scale', { planCode: 'scale', status: 'canceled' }), 'subscribe');
    const views = buildPlanViews({ planCode: 'starter', status: 'active' });
    assert.deepEqual(
      views.map((plan) => plan.action),
      ['current', 'upgrade', 'upgrade'],
    );
    assert.match(formatPaise(149900), /1,499/);
    assert.equal(invoiceAmountPaise({ status: 'paid', amountDuePaise: 0, amountPaidPaise: 499900 }), 499900);
    assert.equal(invoiceAmountPaise({ status: 'open', amountDuePaise: 149900, amountPaidPaise: 0 }), 149900);
  });

  it('accepts only a Stripe checkout URL and the unconfigured error', () => {
    assert.equal(stripeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_123'), 'https://checkout.stripe.com/c/pay/cs_test_123');
    assert.equal(stripeCheckoutUrl('https://example.com/checkout'), null);
    assert.equal(stripeCheckoutUrl('javascript:alert(1)'), null);
    assert.equal(readApiError({ error: 'Billing not configured' }), 'Billing not configured');
    assert.equal(readApiError({}), null);
  });
});
