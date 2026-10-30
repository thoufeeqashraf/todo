import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  cameraStream,
  canAssignToOthers,
  canSeeCompanyTasks,
  canToggleModules,
  decideClockIn,
  haversineMeters,
  industryLabels,
  ledgerBalanceCents,
  moduleEnabled,
  staffHealthScore,
  transactionJunctionTopUp,
} from './platform-rules.ts';

describe('module and role rules', () => {
  it('treats a module as off until the company enables it', () => {
    assert.equal(moduleEnabled(['tasks', 'staff'], 'wallet'), false);
    assert.equal(moduleEnabled(['wallet'], 'wallet'), true);
  });

  it('keeps floor staff from assigning work or reading the whole company', () => {
    assert.equal(canAssignToOthers('user'), false);
    assert.equal(canAssignToOthers('manager'), true);
    assert.equal(canSeeCompanyTasks('user'), false);
    assert.equal(canToggleModules('manager'), false);
    assert.equal(canToggleModules('admin'), true);
  });

  it('ships starter labels for the four first markets', () => {
    for (const name of ['restaurant', 'retail', 'property', 'construction']) {
      const labels = industryLabels(name);
      assert.ok(labels.checklists.length > 0);
      assert.notEqual(labels.site, 'Site');
    }
  });
});

describe('geofence attendance', () => {
  it('allows clock-in inside the radius and refuses it outside', () => {
    const fence = { lat: -26.2041, lng: 28.0473, radiusMeters: 150 };
    const inside = decideClockIn({
      point: { lat: -26.2041, lng: 28.0473 },
      fence,
      travelDay: false,
      manualApproved: false,
    });
    const outside = decideClockIn({
      point: { lat: -26.25, lng: 28.1 },
      fence,
      travelDay: false,
      manualApproved: false,
    });
    assert.equal(inside.allowed, true);
    assert.equal(inside.reason, 'inside_geofence');
    assert.equal(outside.allowed, false);
    assert.equal(outside.reason, 'outside_geofence');
    assert.ok((outside.distanceMeters ?? 0) > 150);
  });

  it('allows a pre-approved travel day without a location', () => {
    const decision = decideClockIn({
      point: null,
      fence: { lat: 0, lng: 0, radiusMeters: 50 },
      travelDay: true,
      manualApproved: false,
    });
    assert.deepEqual(decision, { allowed: true, reason: 'travel_day', distanceMeters: null });
  });

  it('measures a known short distance', () => {
    const meters = haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 0 });
    assert.equal(meters, 0);
  });
});

describe('staff health and wallet stubs', () => {
  it('scores misses down from 100 with the provisional weights', () => {
    const result = staffHealthScore({ misses: 2, late: 1, proofRejected: 0, completed: 3 });
    assert.equal(result.provisional, true);
    assert.equal(result.score, 100 - 30 - 5 + 3);
    assert.equal(result.band, 'watch');
  });

  it('keeps the ledger in integer cents and refuses a provider top-up', () => {
    assert.equal(
      ledgerBalanceCents([
        { amountCents: 5000, direction: 'credit' },
        { amountCents: 1250, direction: 'debit' },
      ]),
      3750,
    );
    const topUp = transactionJunctionTopUp();
    assert.equal(topUp.movedMoney, false);
    assert.equal(topUp.state, 'stub');
  });

  it('does not invent a CCTV stream URL', () => {
    const stream = cameraStream('unconfigured');
    assert.equal(stream.streamUrl, null);
    assert.equal(stream.state, 'stub');
  });
});
