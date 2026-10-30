import assert from 'node:assert/strict';
import test from 'node:test';

import { getHelpArticle } from '../../content/help.ts';
import { customerOnboardingPath, onboardingActionPaths } from './nav.ts';
import { onboardingProgress, onboardingSteps, type OnboardingCounts } from './onboarding-steps.ts';

const empty: OnboardingCounts = {
  teams: 0,
  invitations: 0,
  users: 1,
  enabledModules: 0,
  activeGeofences: 0,
};

function step(counts: OnboardingCounts, id: string) {
  const found = onboardingSteps(counts).find((item) => item.id === id);
  if (!found) throw new Error(`missing step ${id}`);
  return found;
}

test('a new company leaves the web steps open and mobile deferred', () => {
  const steps = onboardingSteps(empty);
  assert.equal(steps.length, 5);
  assert.deepEqual(
    steps.map((item) => item.done),
    [false, false, false, false, false],
  );
  assert.equal(step(empty, 'mobile').deferred, true);
  assert.equal(onboardingProgress(steps).done, 0);
});

test('a team row completes create team, a department count is not an input', () => {
  const team = step({ ...empty, teams: 2 }, 'team');
  assert.equal(team.done, true);
  assert.equal(team.evidence, '2 teams');
});

test('an invitation or a second user completes invite staff', () => {
  assert.equal(step(empty, 'invite').done, false);
  assert.equal(step({ ...empty, invitations: 1 }, 'invite').done, true);
  assert.equal(step({ ...empty, users: 2 }, 'invite').done, true);
  assert.match(step({ ...empty, invitations: 1, users: 3 }, 'invite').evidence, /1 invitation/);
});

test('enabled modules and an active geofence complete those steps', () => {
  assert.equal(step({ ...empty, enabledModules: 1 }, 'modules').done, true);
  assert.equal(step({ ...empty, enabledModules: 1 }, 'modules').evidence, '1 module on');
  assert.equal(step({ ...empty, activeGeofences: 2 }, 'geofence').done, true);
  assert.equal(step({ ...empty, activeGeofences: 2 }, 'geofence').evidence, '2 active geofences');
});

test('mobile stays open even when every stored check is done', () => {
  const counts: OnboardingCounts = {
    teams: 1,
    invitations: 1,
    users: 4,
    enabledModules: 3,
    activeGeofences: 1,
  };
  const steps = onboardingSteps(counts);
  assert.equal(step(counts, 'mobile').done, false);
  assert.equal(step(counts, 'team').href, onboardingActionPaths.staff);
  assert.equal(step(counts, 'invite').href, onboardingActionPaths.staff);
  assert.equal(step(counts, 'modules').href, onboardingActionPaths.modules);
  assert.equal(step(counts, 'geofence').href, onboardingActionPaths.attendance);
  assert.equal(step(counts, 'mobile').href, onboardingActionPaths.mobileArticle);
  assert.equal(onboardingProgress(steps).href, customerOnboardingPath);
  assert.ok(getHelpArticle('connect-mobile'));
  assert.equal(onboardingProgress(steps).done, 4);
  assert.equal(onboardingProgress(steps).total, 5);
});
