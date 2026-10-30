import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PlatformError } from './platform-error.ts';
import {
  assertModuleEnabled,
  canReadIncident,
  canReadSchedule,
  canReadTask,
  companyOrOwn,
  scopedCompanyId,
  staffEditDecision,
  taskDeleteDecision,
  taskListScope,
  taskUpdateDecision,
  walletReadUserId,
} from './tenant-scope.ts';

const companyA = { companyId: 'company-a', userId: 'user-a', role: 'user' as const };
const managerA = { companyId: 'company-a', userId: 'manager-a', role: 'manager' as const };
const adminA = { companyId: 'company-a', userId: 'admin-a', role: 'admin' as const };

describe('tenant isolation', () => {
  it('refuses a company id that is not the caller company', () => {
    assert.equal(scopedCompanyId(companyA), 'company-a');
    assert.throws(
      () => scopedCompanyId(companyA, 'company-b'),
      (error: unknown) => error instanceof PlatformError && error.code === 'forbidden' && error.status === 403,
    );
  });

  it('keeps floor staff on their own rows and managers on the company', () => {
    assert.deepEqual(taskListScope(companyA), { companyId: 'company-a', ownUserId: 'user-a' });
    assert.deepEqual(companyOrOwn(managerA, true), { companyId: 'company-a', ownUserId: null });
    assert.equal(canReadTask(companyA, { assigned_to_id: 'someone-else', assigned_by_id: 'manager-a' }), false);
    assert.equal(canReadTask(companyA, { assigned_to_id: 'user-a', assigned_by_id: 'manager-a' }), true);
    assert.equal(canReadIncident(companyA, { reported_by: 'someone-else' }), false);
    assert.equal(canReadIncident(managerA, { reported_by: 'someone-else' }), true);
    assert.equal(canReadSchedule(companyA, { user_id: 'someone-else' }), false);
    assert.equal(canReadSchedule(adminA, { user_id: 'someone-else' }), true);
  });

  it('does not let a manager read another person wallet or edit an admin', () => {
    assert.equal(walletReadUserId(managerA, 'user-a'), 'forbidden');
    assert.equal(walletReadUserId(adminA, 'user-a'), 'user-a');
    assert.equal(walletReadUserId(companyA, undefined), 'user-a');
    assert.equal(staffEditDecision(managerA, { role: 'admin', userId: 'admin-a' }, { isActive: false }), 'forbidden');
    assert.equal(staffEditDecision(adminA, { role: 'user', userId: 'user-a' }, { role: 'manager' }), 'ok');
    assert.equal(staffEditDecision(adminA, { role: 'admin', userId: 'admin-a' }, { isActive: false }), 'forbidden');
  });

  it('hides task edits the caller cannot see and blocks floor deletes', () => {
    const hidden = taskUpdateDecision(companyA, { assigned_to_id: 'other', assigned_by_id: 'other' }, {});
    assert.equal(hidden.ok, false);
    if (!hidden.ok) assert.equal(hidden.status, 404);
    const reassign = taskUpdateDecision(companyA, { assigned_to_id: 'user-a', assigned_by_id: 'user-a' }, { assignedToId: 'other' });
    assert.equal(reassign.ok, false);
    if (!reassign.ok) assert.equal(reassign.code, 'forbidden');
    const removed = taskDeleteDecision(companyA);
    assert.equal(removed.ok, false);
    assert.equal(taskDeleteDecision(managerA).ok, true);
  });
});

describe('module gating', () => {
  it('rejects a module the company has not enabled', () => {
    assert.throws(
      () => assertModuleEnabled(['tasks', 'staff'], 'wallet'),
      (error: unknown) =>
        error instanceof PlatformError &&
        error.code === 'module_disabled' &&
        error.status === 403 &&
        error.details?.module === 'wallet',
    );
  });

  it('allows a module that is on', () => {
    assert.doesNotThrow(() => assertModuleEnabled(['geofence_attendance'], 'geofence_attendance'));
  });
});
