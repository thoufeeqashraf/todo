import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { consumeRateLimit, rateLimitPolicy, resetRateLimits } from './rate-limit.ts';

describe('rate limiting', () => {
  it('uses a tighter window for login and invitation accept', () => {
    assert.equal(rateLimitPolicy(['auth', 'login']).limit, 10);
    assert.equal(rateLimitPolicy(['invitations', 'accept']).bucket, 'auth');
    assert.equal(rateLimitPolicy(['tasks']).limit, 120);
  });

  it('blocks the call that exceeds the limit and allows a new window', () => {
    resetRateLimits();
    const first = consumeRateLimit('ip:auth', 2, 60_000, 1_000);
    const second = consumeRateLimit('ip:auth', 2, 60_000, 1_100);
    const third = consumeRateLimit('ip:auth', 2, 60_000, 1_200);
    assert.equal(first.ok, true);
    assert.equal(first.remaining, 1);
    assert.equal(second.ok, true);
    assert.equal(second.remaining, 0);
    assert.equal(third.ok, false);
    assert.equal(third.retryAfterSeconds, 60);
    const later = consumeRateLimit('ip:auth', 2, 60_000, 61_000);
    assert.equal(later.ok, true);
    resetRateLimits();
  });
});
