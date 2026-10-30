export type OnboardingCounts = {
  teams: number;
  invitations: number;
  users: number;
  enabledModules: number;
  activeGeofences: number;
};

export type OnboardingStepId = 'team' | 'invite' | 'modules' | 'geofence' | 'mobile';

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  summary: string;
  evidence: string;
  done: boolean;
  /** Mobile has no stored client. It stays open after the other checks pass. */
  deferred: boolean;
  href: string;
  hrefLabel: string;
};

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function onboardingSteps(counts: OnboardingCounts): OnboardingStep[] {
  const teamDone = counts.teams > 0;
  const inviteDone = counts.invitations > 0 || counts.users > 1;
  const modulesDone = counts.enabledModules > 0;
  const geofenceDone = counts.activeGeofences > 0;

  let inviteEvidence = 'Only the first admin is in this company';
  if (counts.invitations > 0 && counts.users > 1) {
    inviteEvidence = `${countLabel(counts.invitations, 'invitation', 'invitations')} · ${countLabel(counts.users, 'person', 'people')}`;
  } else if (counts.invitations > 0) {
    inviteEvidence = countLabel(counts.invitations, 'invitation', 'invitations');
  } else if (counts.users > 1) {
    inviteEvidence = countLabel(counts.users, 'person', 'people');
  }

  return [
    {
      id: 'team',
      title: 'Create a team',
      summary: 'A team is a named group on this company. The checklist looks for a row in teams, not a department.',
      evidence: teamDone ? countLabel(counts.teams, 'team', 'teams') : 'No team yet',
      done: teamDone,
      deferred: false,
      href: '/customer/staff',
      hrefLabel: 'Open staff',
    },
    {
      id: 'invite',
      title: 'Invite staff',
      summary: 'An invitation, or anyone besides the first admin, completes this step. Mail is not sent — copy the invite link.',
      evidence: inviteEvidence,
      done: inviteDone,
      deferred: false,
      href: '/customer/staff',
      hrefLabel: 'Invite someone',
    },
    {
      id: 'modules',
      title: 'Enable modules',
      summary: 'Industry defaults can turn modules on at signup. This step is done when at least one company module is enabled.',
      evidence: modulesDone ? countLabel(counts.enabledModules, 'module on', 'modules on') : 'Every module is off',
      done: modulesDone,
      deferred: false,
      href: '/customer/modules',
      hrefLabel: 'Review modules',
    },
    {
      id: 'geofence',
      title: 'Set a geofence',
      summary: 'An admin saves a named fence with a centre and a radius. Only an active fence counts. Map tiles are not connected.',
      evidence: geofenceDone
        ? countLabel(counts.activeGeofences, 'active geofence', 'active geofences')
        : 'No active geofence',
      done: geofenceDone,
      deferred: false,
      href: '/customer/module/attendance',
      hrefLabel: 'Open attendance',
    },
    {
      id: 'mobile',
      title: 'Connect mobile later',
      summary:
        'The web console is the source of truth. iOS and Android are not scaffolded, and no table records a paired phone. API tokens here are web sessions.',
      evidence: 'No mobile client is stored',
      done: false,
      deferred: true,
      href: '/help/connect-mobile',
      hrefLabel: 'Why it waits',
    },
  ];
}

export function onboardingProgress(steps: OnboardingStep[]) {
  const done = steps.filter((step) => step.done).length;
  return { done, total: steps.length, href: '/customer/onboarding' };
}
