import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { gateApiRoute, matchApiRoute } from '../platform-rules.ts';
import { authorizeOwner } from './guard.ts';
import { executeOwner, buildOverview, updateTenant, createTenant } from './service.ts';
import type { AuditInsert, CompanyRow, OwnerStore } from './types.ts';

const OWNER_EMAILS = ['thoufeeq2009@gmail.com'];

function companyAdmin() {
  return authorizeOwner(
    { userId: 'admin-1', email: 'admin@acme.test', role: 'admin', companyId: 'company-acme' },
    'acme',
    OWNER_EMAILS,
  );
}

function vendor() {
  return authorizeOwner(
    { userId: 'owner-1', email: 'thoufeeq2009@gmail.com', role: 'admin', companyId: 'company-hq' },
    'todo-app-hq',
    OWNER_EMAILS,
  );
}

function throwingStore(): OwnerStore {
  return new Proxy({} as OwnerStore, {
    get() {
      throw new Error('tenant store was read');
    },
  });
}

describe('owner API handlers', () => {
  it('returns 401 before reading tenants when nobody is signed in', async () => {
    const result = await executeOwner({
      auth: authorizeOwner(null, null, OWNER_EMAILS),
      method: 'GET',
      parts: ['tenants'],
      searchParams: new URLSearchParams(),
      body: undefined,
      store: throwingStore(),
    });
    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { error: { code: 'unauthorized', message: 'Not authenticated.' } });
  });

  it('returns 403 for a normal company admin and does not read tenant data', async () => {
    const result = await executeOwner({
      auth: companyAdmin(),
      method: 'GET',
      parts: ['owner', 'tenants'],
      searchParams: new URLSearchParams({ q: 'secret' }),
      body: undefined,
      store: throwingStore(),
    });
    assert.equal(result.status, 403);
    assert.deepEqual(result.body, { error: { code: 'forbidden', message: 'Platform owner access is required.' } });
    assert.equal(JSON.stringify(result.body).includes('secret'), false);
    assert.equal(JSON.stringify(result.body).includes('acme'), false);
  });

  it('returns 403 for a headquarters manager who is not on the owner list', async () => {
    const auth = authorizeOwner(
      { userId: 'mgr-1', email: 'manager@hq.example', role: 'manager', companyId: 'company-hq' },
      'todo-app-hq',
      OWNER_EMAILS,
    );
    const result = await executeOwner({
      auth,
      method: 'GET',
      parts: ['overview'],
      searchParams: new URLSearchParams(),
      body: undefined,
      store: throwingStore(),
    });
    assert.equal(result.status, 403);
  });

  it('lets the vendor account read the overview when billing tables are missing', async () => {
    const store = {
      countCompanies: async () => 3,
      countSuspended: async () => 1,
      countUsers: async () => 12,
      countTasks: async () => null,
      countCompaniesCreatedSince: async () => 2,
      listRecentCompanies: async () => [],
      companiesCreatedSince: async () => [{ createdAt: '2026-10-30T00:00:00.000Z' }],
      listSubscriptions: async () => null,
      listOwnerAudit: async () => [],
    } as Pick<OwnerStore, keyof typeof store> as OwnerStore;
    const overview = await buildOverview(store, new Date('2026-10-30T12:00:00.000Z'));
    assert.equal(overview.totals.tenants, 3);
    assert.equal(overview.totals.activeTenants, 2);
    assert.equal(overview.totals.tasks, null);
    assert.equal(overview.billing.available, false);
    const result = await executeOwner({
      auth: vendor(),
      method: 'GET',
      parts: ['overview'],
      searchParams: new URLSearchParams(),
      body: undefined,
      store,
    });
    assert.equal(result.status, 200);
  });

  it('writes a suspend audit entry and no other company is involved', async () => {
    const audits: AuditInsert[] = [];
    const row: CompanyRow = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Acme',
      slug: 'acme',
      industryId: null,
      industryName: null,
      industryDisplayName: 'Retail',
      region: 'za',
      settings: {},
      createdAt: '2026-10-01T00:00:00.000Z',
      status: 'active',
    };
    let current = row;
    const store = {
      getCompany: async (id: string) => (id === row.id ? current : null),
      updateCompany: async (_id: string, patch: { settings?: Record<string, unknown> }) => {
        current = { ...current, settings: patch.settings ?? current.settings, status: 'suspended' };
      },
      insertAudit: async (entry: AuditInsert) => {
        audits.push(entry);
      },
    } as OwnerStore;
    const auth = vendor();
    assert.equal(auth.ok, true);
    if (!auth.ok) return;
    const result = await updateTenant(auth.owner, row.id, { status: 'suspended' }, store);
    assert.equal(result.status, 200);
    assert.equal(audits.length, 1);
    assert.equal(audits[0]?.action, 'owner.tenant.suspended');
    assert.equal(audits[0]?.companyId, row.id);
    assert.equal(audits[0]?.userId, 'owner-1');
  });

  it('creates a business and audits the create and the admin invite', async () => {
    const audits: string[] = [];
    const industryId = '22222222-2222-4222-8222-222222222222';
    const store = {
      industry: async () => ({
        id: industryId,
        name: 'restaurant',
        displayName: 'Restaurant',
        description: null,
        defaultModules: ['tasks', 'inventory'],
      }),
      catalogue: async () => [
        { id: 'm-tasks', name: 'tasks', displayName: 'Tasks', description: null, category: 'core' },
        { id: 'm-staff', name: 'staff', displayName: 'Staff', description: null, category: 'core' },
        { id: 'm-notes', name: 'notifications', displayName: 'Notifications', description: null, category: 'system' },
        { id: 'm-inv', name: 'inventory', displayName: 'Inventory', description: null, category: 'operations' },
      ],
      availableSlug: async () => 'north-kitchen',
      insertCompany: async (created: { name: string; slug: string; industryId: string; region: string; settings: Record<string, unknown> }) => ({
        id: '33333333-3333-4333-8333-333333333333',
        name: created.name,
        slug: created.slug,
        industryId: created.industryId,
        industryName: 'restaurant',
        industryDisplayName: 'Restaurant',
        region: created.region,
        settings: created.settings,
        createdAt: '2026-10-30T00:00:00.000Z',
        status: 'active' as const,
      }),
      insertCompanyModules: async () => undefined,
      insertInvitation: async () => ({ id: '44444444-4444-4444-8444-444444444444', expiresAt: '2026-11-06T00:00:00.000Z' }),
      insertAudit: async (entry: AuditInsert) => {
        audits.push(entry.action);
      },
      deleteCompany: async () => {
        throw new Error('rolled back a successful create');
      },
    } as OwnerStore;
    const auth = vendor();
    assert.equal(auth.ok, true);
    if (!auth.ok) return;
    const result = await createTenant(
      auth.owner,
      {
        companyName: 'North Kitchen',
        industryId,
        region: 'za',
        adminEmail: 'ada@north.example',
        adminFirstName: 'Ada',
        adminLastName: 'Chef',
      },
      store,
    );
    assert.equal(result.status, 201);
    const body = result.body as { invitation: { invitePath: string; emailSent: boolean }; company: { slug: string } };
    assert.equal(body.company.slug, 'north-kitchen');
    assert.equal(body.invitation.emailSent, false);
    assert.match(body.invitation.invitePath, /^\/invite\//);
    assert.deepEqual(audits.sort(), ['owner.invitation.created', 'owner.tenant.created']);
  });

  it('rejects an empty create body for an owner', async () => {
    const result = await executeOwner({
      auth: vendor(),
      method: 'POST',
      parts: ['tenants'],
      searchParams: new URLSearchParams(),
      body: {},
      store: throwingStore(),
    });
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, { error: { code: 'invalid', message: 'Invalid input.' } });
  });

  it('keeps owner routes in the mobile catalogue and still forbids a company admin', async () => {
    const route = matchApiRoute('GET', ['owner', 'overview']);
    assert.ok(route);
    assert.equal(route?.path, '/api/v1/owner/overview');
    assert.equal(gateApiRoute(route, { role: 'admin' }, []).ok, true);
    const result = await executeOwner({
      auth: companyAdmin(),
      method: 'GET',
      parts: ['owner', 'overview'],
      searchParams: new URLSearchParams(),
      body: undefined,
      store: throwingStore(),
    });
    assert.equal(result.status, 403);
    assert.equal(matchApiRoute('PATCH', ['owner', 'tenants', '11111111-1111-4111-8111-111111111111', 'modules'])?.path, '/api/v1/owner/tenants/:id/modules');
  });
});

describe('owner data selection', () => {
  it('does not select password hashes in the service-role store', () => {
    const source = readFileSync(new URL('./supabase-store.ts', import.meta.url), 'utf8');
    assert.equal(source.includes('password'), false);
  });
});
