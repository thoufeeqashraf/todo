import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getPlan,
  isPlanCode,
  listPlans,
  planCodeForPriceId,
  stripePriceId,
} from './plans.ts';

describe('billing plan catalogue', () => {
  it('lists Starter, Growth, and Scale in INR', () => {
    const plans = listPlans();
    assert.deepEqual(plans.map((plan) => plan.code), ['starter', 'growth', 'scale']);
    assert.deepEqual(plans.map((plan) => plan.name), ['Starter', 'Growth', 'Scale']);
    for (const plan of plans) {
      assert.equal(plan.currency, 'INR');
      assert.equal(plan.interval, 'month');
      assert.equal(plan.amountPaise % 100, 0);
      assert.ok(plan.amountPaise >= 100);
    }
    assert.equal(getPlan('starter')?.amountPaise, 149900);
    assert.equal(getPlan('growth')?.amountPaise, 499900);
    assert.equal(getPlan('scale')?.amountPaise, 1499900);
    assert.equal(getPlan('enterprise'), undefined);
    assert.equal(isPlanCode('growth'), true);
    assert.equal(isPlanCode('free'), false);
  });

  it('reads a Stripe price id only when asked', () => {
    const previous = process.env.STRIPE_PRICE_STARTER;
    delete process.env.STRIPE_PRICE_STARTER;
    const starter = getPlan('starter');
    assert.ok(starter);
    assert.equal(stripePriceId(starter), undefined);

    process.env.STRIPE_PRICE_STARTER = 'price_test_starter';
    assert.equal(stripePriceId(starter), 'price_test_starter');
    assert.equal(planCodeForPriceId('price_test_starter'), 'starter');

    process.env.STRIPE_PRICE_STARTER = 'price_your_starter';
    assert.equal(stripePriceId(starter), undefined);

    if (previous === undefined) delete process.env.STRIPE_PRICE_STARTER;
    else process.env.STRIPE_PRICE_STARTER = previous;
  });
});
