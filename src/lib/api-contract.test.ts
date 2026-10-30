import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { API_ROLE_FLOOR, API_V1_CATALOG, gateApiRoute, matchApiRoute } from './platform-rules.ts';

const TASK_ID = '11111111-1111-4111-8111-111111111111';

describe('API route catalogue', () => {
  it('matches static and id routes and misses unknown ones', () => {
    assert.equal(matchApiRoute('GET', ['tasks'])?.path, '/api/v1/tasks');
    assert.equal(matchApiRoute('PATCH', ['tasks', TASK_ID])?.path, '/api/v1/tasks/:id');
    assert.equal(matchApiRoute('POST', ['attendance', 'clock-out'])?.module, 'geofence_attendance');
    assert.equal(matchApiRoute('GET', ['wallet', 'entries'])?.module, 'wallet');
    assert.equal(matchApiRoute('PUT', ['tasks']), null);
    assert.equal(matchApiRoute('GET', ['tasks', 'not-an-id']), null);
  });

  it('keeps catalogue paths unique per method', () => {
    const seen = new Set<string>();
    for (const route of API_V1_CATALOG) {
      const key = `${route.method} ${route.path}`;
      assert.equal(seen.has(key), false, key);
      seen.add(key);
    }
  });

  it('points role floors at real catalogue routes', () => {
    for (const key of Object.keys(API_ROLE_FLOOR)) {
      const method = key.slice(0, key.indexOf(' '));
      const path = key.slice(key.indexOf(' ') + 1).replace('/api/v1/', '');
      assert.ok(matchApiRoute(method, path.split('/')), key);
    }
  });
});

describe('module and permission gating', () => {
  it('blocks a bearer route when the module is off', () => {
    const route = matchApiRoute('GET', ['wallet']);
    assert.ok(route);
    const decision = gateApiRoute(route, { role: 'admin' }, ['tasks']);
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.status, 403);
      assert.equal(decision.code, 'module_disabled');
      assert.equal(decision.module, 'wallet');
    }
  });

  it('allows the same route when the module is on', () => {
    const route = matchApiRoute('POST', ['attendance', 'clock-in']);
    assert.ok(route);
    assert.equal(gateApiRoute(route, { role: 'user' }, ['geofence_attendance']).ok, true);
  });

  it('requires a bearer token before module checks', () => {
    const route = matchApiRoute('GET', ['tasks']);
    assert.ok(route);
    const decision = gateApiRoute(route, null, []);
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.code, 'unauthorized');
  });

  it('keeps floor staff out of admin and manager routes', () => {
    const audit = matchApiRoute('GET', ['audit']);
    const adjustment = matchApiRoute('POST', ['wallet', 'adjustment']);
    const remove = matchApiRoute('DELETE', ['tasks', TASK_ID]);
    assert.ok(audit && adjustment && remove);
    assert.equal(gateApiRoute(audit, { role: 'manager' }, []).ok, false);
    assert.equal(gateApiRoute(adjustment, { role: 'manager' }, ['wallet']).ok, false);
    assert.equal(gateApiRoute(remove, { role: 'user' }, ['tasks']).ok, false);
    assert.equal(gateApiRoute(audit, { role: 'admin' }, []).ok, true);
    assert.equal(gateApiRoute(remove, { role: 'manager' }, ['tasks']).ok, true);
  });

  it('leaves public auth open and still names the staff module on invite accept', () => {
    const login = matchApiRoute('POST', ['auth', 'login']);
    const accept = matchApiRoute('POST', ['invitations', 'accept']);
    assert.ok(login && accept);
    assert.equal(gateApiRoute(login, null, []).ok, true);
    assert.equal(accept.auth, 'none');
    assert.equal(accept.module, 'staff');
  });
});
