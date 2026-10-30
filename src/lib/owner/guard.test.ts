import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { authorizeOwner, isPlatformOwner, parsePlatformOwnerEmails, DEFAULT_PLATFORM_OWNER_EMAIL, HQ_COMPANY_SLUG } from './guard.ts';
import { isMissingRelation, loginAllowed, safeInternalPath, sanitizeSearch, signupBuckets, summarizeBilling, tenantStatus } from './model.ts';
import { resetRateLimits } from '../rate-limit.ts';
import { takeOwnerSlot } from './rate.ts';

describe('platform owner emails', () => {
  it('defaults to the vendor account when the env value is missing or blank', () => {
    assert.deepEqual(parsePlatformOwnerEmails(undefined), [DEFAULT_PLATFORM_OWNER_EMAIL]);
    assert.deepEqual(parsePlatformOwnerEmails(''), [DEFAULT_PLATFORM_OWNER_EMAIL]);
    assert.deepEqual(parsePlatformOwnerEmails('  , , '), [DEFAULT_PLATFORM_OWNER_EMAIL]);
    assert.equal(DEFAULT_PLATFORM_OWNER_EMAIL, 'thoufeeq2009@gmail.com');
  });

  it('parses a comma-separated list and ignores junk', () => {
    assert.deepEqual(parsePlatformOwnerEmails(' Owner@Example.com, not-an-email, second@example.com '), [
      'owner@example.com',
      'second@example.com',
    ]);
  });
});

describe('platform owner claim', () => {
  const emails = ['thoufeeq2009@gmail.com'];

  it('treats the listed email as the owner in any company and role', () => {
    assert.equal(
      isPlatformOwner({ email: 'Thoufeeq2009@gmail.com', role: 'user', companySlug: 'other-co' }, emails),
      true,
    );
  });

  it('treats the admin of todo-app-hq as the owner', () => {
    assert.equal(isPlatformOwner({ email: 'ada@hq.example', role: 'admin', companySlug: HQ_COMPANY_SLUG }, emails), true);
  });

  it('does not treat a manager of headquarters or another company admin as the owner', () => {
    assert.equal(isPlatformOwner({ email: 'sam@hq.example', role: 'manager', companySlug: HQ_COMPANY_SLUG }, emails), false);
    assert.equal(isPlatformOwner({ email: 'admin@acme.test', role: 'admin', companySlug: 'acme' }, emails), false);
    assert.equal(isPlatformOwner({ email: 'admin@acme.test', role: 'admin', companySlug: null }, emails), false);
  });
});

describe('owner authorization', () => {
  it('returns 401 when there is no session', () => {
    const auth = authorizeOwner(null, null);
    assert.equal(auth.ok, false);
    if (!auth.ok) {
      assert.equal(auth.status, 401);
      assert.equal(auth.code, 'unauthorized');
    }
  });

  it('returns 403 for a normal company admin', () => {
    const auth = authorizeOwner(
      { userId: 'user-1', email: 'admin@acme.test', role: 'admin', companyId: 'company-1' },
      'acme',
      ['thoufeeq2009@gmail.com'],
    );
    assert.equal(auth.ok, false);
    if (!auth.ok) {
      assert.equal(auth.status, 403);
      assert.equal(auth.code, 'forbidden');
    }
  });
});

describe('tenant status helpers', () => {
  it('reads suspension from settings and leaves other businesses active', () => {
    assert.equal(tenantStatus({ status: 'suspended', theme: 'blue' }), 'suspended');
    assert.equal(tenantStatus({}), 'active');
    assert.equal(tenantStatus(null), 'active');
  });

  it('blocks sign-in to a suspended business except for a platform owner', () => {
    const settings = { status: 'suspended' };
    assert.equal(loginAllowed({ email: 'admin@acme.test', role: 'admin', companySlug: 'acme' }, settings), false);
    assert.equal(loginAllowed({ email: 'thoufeeq2009@gmail.com', role: 'user', companySlug: 'acme' }, settings), true);
    assert.equal(loginAllowed({ email: 'ada@hq.example', role: 'admin', companySlug: 'todo-app-hq' }, settings), true);
    assert.equal(loginAllowed({ email: 'admin@acme.test', role: 'admin', companySlug: 'acme' }, {}), true);
  });

  it('recognises a missing billing table', () => {
    assert.equal(isMissingRelation({ code: 'PGRST205', message: 'Could not find the table public.subscriptions' }), true);
    assert.equal(isMissingRelation({ code: '42P01', message: 'relation does not exist' }), true);
    assert.equal(isMissingRelation({ message: 'permission denied' }), false);
    assert.equal(isMissingRelation(null), false);
  });

  it('buckets signups by UTC day and summarises plans', () => {
    const buckets = signupBuckets(['2026-10-30T01:00:00.000Z', '2026-10-30T18:00:00.000Z'], 2, new Date('2026-10-30T12:00:00.000Z'));
    assert.deepEqual(buckets, [
      { date: '2026-10-29', signups: 0 },
      { date: '2026-10-30', signups: 2 },
    ]);
    assert.equal(summarizeBilling(null).available, false);
    const summary = summarizeBilling([
      { planCode: 'starter', status: 'active' },
      { planCode: 'starter', status: 'canceled' },
    ]);
    assert.equal(summary.available, true);
    assert.equal(summary.byPlan[0]?.plan, 'starter');
    assert.equal(summary.byPlan[0]?.count, 2);
  });

  it('keeps search text and next paths inside safe bounds', () => {
    assert.equal(sanitizeSearch('Acme, %_kitchen'), 'acme kitchen');
    assert.equal(safeInternalPath('/owner/tenants'), '/owner/tenants');
    assert.equal(safeInternalPath('https://evil.example/owner'), null);
    assert.equal(safeInternalPath('//evil.example'), null);
    assert.equal(safeInternalPath('/login'), null);
  });
});

describe('owner rate limit', () => {
  it('limits a client address', () => {
    resetRateLimits();
    const ip = '203.0.113.10';
    assert.equal(takeOwnerSlot(ip, 2).ok, true);
    assert.equal(takeOwnerSlot(ip, 2).ok, true);
    const blocked = takeOwnerSlot(ip, 2);
    assert.equal(blocked.ok, false);
    resetRateLimits();
  });
});
