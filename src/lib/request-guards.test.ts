import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { z } from 'zod';

import { slugCandidate } from './auth-utils.ts';
import { PlatformError } from './platform-error.ts';
import {
  customerCookieAllows,
  bearerStillValid,
  clientAddress,
  consumeRateLimit,
  enforceAuthLogin,
  enforceAuthSignup,
  hashToken,
  isBearerTokenShape,
  isForeignCompany,
  isIsoDateTime,
  isUuid,
  normalizeTaskStatus,
  rateLimitSize,
  readJson,
  RequestGuardError,
  resetRateLimits,
  taskVisibilityFilter,
  webError,
} from './request-guards.ts';

function jsonRequest(body: string) {
  return new Request('http://localhost/api/auth/customer-login', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
  });
}

describe('request guards', () => {
  it('rejects malformed JSON, oversized bodies, and null bytes', async () => {
    await assert.rejects(readJson(jsonRequest('{"email":')), RequestGuardError);
    const huge = `{"email":"${'a'.repeat(70_000)}"}`;
    await assert.rejects(readJson(jsonRequest(huge)), (error: unknown) => {
      assert.ok(error instanceof RequestGuardError);
      assert.equal(error.status, 413);
      return true;
    });
    await assert.rejects(readJson(jsonRequest('{"email":"a\\u0000b@example.com"}')), (error: unknown) => {
      assert.ok(error instanceof RequestGuardError);
      assert.equal(error.status, 400);
      return true;
    });
  });

  it('does not echo secrets or validator internals', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });
    assert.throws(() => schema.parse({ email: 'not-an-email', password: 'super-secret-value' }), (error: unknown) => {
      const mapped = webError(error);
      const encoded = JSON.stringify(mapped);
      assert.equal(mapped?.status, 400);
      assert.equal(mapped?.body.error, 'Invalid input data');
      assert.equal(encoded.includes('super-secret-value'), false);
      assert.equal(encoded.includes('issues'), false);
      assert.equal(encoded.includes('pattern'), false);
      return true;
    });
  });

  it('rate limits a burst and bounds the bucket map', () => {
    resetRateLimits();
    const request = { headers: { get: () => null } };
    for (let attempt = 0; attempt < 10; attempt += 1) enforceAuthLogin(request);
    assert.throws(() => enforceAuthLogin(request), (error: unknown) => {
      assert.ok(error instanceof RequestGuardError);
      assert.equal(error.status, 429);
      assert.ok((error.retryAfter ?? 0) > 0);
      return true;
    });

    resetRateLimits();
    for (let index = 0; index < 5_000; index += 1) consumeRateLimit(`ip:${index}`, 1, 60_000, 1_000);
    assert.ok(rateLimitSize() <= 2_000);
  });

  it('ignores spoofed forwarded headers that are not addresses', () => {
    const request = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': `<script>, ${'x'.repeat(4000)}` },
    });
    assert.equal(clientAddress(request), 'unknown');
    assert.equal(clientAddress(new Request('http://localhost/', { headers: { 'x-real-ip': '203.0.113.8' } })), '203.0.113.8');
  });

  it('rejects SQL-ish and script task filters and unsafe or() clauses', () => {
    assert.equal(normalizeTaskStatus('todo'), 'todo');
    assert.equal(normalizeTaskStatus(null), undefined);
    assert.equal(normalizeTaskStatus("' OR 1=1 --"), null);
    assert.equal(normalizeTaskStatus('<script>alert(1)</script>'), null);
    assert.equal(isUuid("11111111-1111-4111-8111-111111111111' OR 1=1"), false);
    assert.equal(taskVisibilityFilter('11111111-1111-4111-8111-111111111111').includes(','), true);
    assert.throws(() => taskVisibilityFilter("11111111-1111-4111-8111-111111111111,role.eq.admin"), RequestGuardError);
  });

  it('treats forged and expired bearer tokens as unusable', () => {
    assert.equal(isBearerTokenShape('forged'), false);
    assert.equal(isBearerTokenShape('a'.repeat(43)), true);
    assert.equal(isBearerTokenShape(`${'a'.repeat(43)}extra`), false);
    assert.equal(bearerStillValid('2000-01-01T00:00:00.000Z', Date.parse('2026-01-01T00:00:00.000Z')), false);
    assert.equal(bearerStillValid('2099-01-01T00:00:00.000Z', Date.parse('2026-01-01T00:00:00.000Z')), true);
    assert.equal(bearerStillValid('not-a-date'), false);
    const raw = 'forged-token-value';
    const hashed = hashToken(raw);
    assert.notEqual(hashed, raw);
    assert.match(hashed, /^[a-f0-9]{64}$/);
  });

  it('blocks a record that belongs to another company', () => {
    assert.equal(isForeignCompany('company-a', 'company-a'), false);
    assert.equal(isForeignCompany('company-a', 'company-b'), true);
    assert.equal(isForeignCompany('company-a', null), true);
  });

  it('keeps company slugs inside the column and strips SQL punctuation', () => {
    assert.equal(slugCandidate("Robert'); DROP TABLE companies;--", 0), 'robert-drop-table-companies');
    assert.equal(slugCandidate('!!!', 0), null);
    assert.equal(slugCandidate('Acme', 25), null);
    assert.equal(slugCandidate('a'.repeat(255), 0)?.length, 90);
    assert.equal(isIsoDateTime('2026-10-30T14:30'), true);
    assert.equal(isIsoDateTime('<script>'), false);
  });

  it('sends anonymous visitors away from company pages', () => {
    assert.equal(customerCookieAllows(undefined), false);
    assert.equal(customerCookieAllows('forged'), false);
    assert.equal(customerCookieAllows('<script>alert(1)</script>'), false);
    assert.equal(customerCookieAllows('a'.repeat(43)), true);
  });

  it('maps auth failures without turning them into server errors', () => {
    const mapped = webError(new PlatformError('unauthorized', 'Not authenticated', 401));
    assert.equal(mapped?.status, 401);
    assert.equal(mapped?.body.error, 'Not authenticated');
  });

  it('limits signup separately from login', () => {
    resetRateLimits();
    const request = { headers: { get: () => null } };
    for (let attempt = 0; attempt < 5; attempt += 1) enforceAuthSignup(request);
    assert.throws(() => enforceAuthSignup(request), (error: unknown) => {
      assert.ok(error instanceof RequestGuardError);
      assert.equal(error.status, 429);
      return true;
    });
  });
});
