import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ownerGateDocument, ownerPageStatus, type OwnerPageClaim } from './page-access.ts';

const vendor: OwnerPageClaim = {
  userId: '11111111-1111-4111-8111-111111111111',
  email: 'thoufeeq2009@gmail.com',
  role: 'admin',
  companyId: '22222222-2222-4222-8222-222222222222',
  companySlug: 'todo-app-hq',
};

const companyAdmin: OwnerPageClaim = {
  ...vendor,
  email: 'admin@acme.test',
  role: 'admin',
  companySlug: 'acme',
};

const shaped = 'a'.repeat(43);

describe('owner page status', () => {
  it('returns 401 for a missing cookie and does not read tenant data', async () => {
    let called = false;
    const status = await ownerPageStatus(undefined, async () => {
      called = true;
      return vendor;
    });
    assert.equal(status, 401);
    assert.equal(called, false);
  });

  it('returns 401 for a forged cookie and does not read tenant data', async () => {
    let called = false;
    const status = await ownerPageStatus('forged', async () => {
      called = true;
      return vendor;
    });
    assert.equal(status, 401);
    assert.equal(called, false);
  });

  it('returns 401 when the session cannot be resolved', async () => {
    assert.equal(await ownerPageStatus(shaped, async () => null), 401);
    assert.equal(
      await ownerPageStatus(shaped, async () => {
        throw new Error('database down');
      }),
      401,
    );
  });

  it('returns 403 for a normal company admin', async () => {
    const status = await ownerPageStatus(shaped, async () => companyAdmin);
    assert.equal(status, 403);
  });

  it('returns 200 for the vendor email and for the headquarters admin', async () => {
    assert.equal(await ownerPageStatus(shaped, async () => vendor), 200);
    assert.equal(
      await ownerPageStatus(shaped, async () => ({ ...companyAdmin, email: 'ada@hq.example', companySlug: 'todo-app-hq' })),
      200,
    );
  });
});

describe('owner gate document', () => {
  it('sends signed-out visitors to customer login', () => {
    const html = ownerGateDocument(401);
    assert.match(html, /Sign in required/);
    assert.match(html, /href="\/customer-login\?next=\/owner"/);
    assert.match(html, /noindex/);
  });

  it('sends a company admin back to their company', () => {
    const html = ownerGateDocument(403);
    assert.match(html, /Platform owner only/);
    assert.match(html, /href="\/customer"/);
    assert.doesNotMatch(html, /customer-login/);
  });
});
