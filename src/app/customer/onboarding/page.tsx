import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ConfigNotice } from '@/components/config-notice';
import { OnboardingChecklist } from '@/components/help/onboarding-checklist';
import { onboardingSteps, type OnboardingCounts } from '@/components/help/onboarding-steps';
import { getCustomerSession } from '@/lib/customer-session';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

export const instant = false;

export const metadata: Metadata = {
  title: 'Setup checklist',
  description: 'Team, staff, modules, geofence, and mobile — counted from this company’s stored rows.',
};

async function loadCounts(companyId: string): Promise<OnboardingCounts | null> {
  const [teams, invitations, users, modules, geofences] = await Promise.all([
    supabaseAdmin.from('teams').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabaseAdmin.from('invitations').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabaseAdmin
      .from('company_modules')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_enabled', true),
    supabaseAdmin
      .from('geofences')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('active', true),
  ]);

  const failed = [teams.error, invitations.error, users.error, modules.error, geofences.error].find(Boolean);
  if (failed) {
    console.error('Could not read setup checklist counts', failed.message);
    return null;
  }

  return {
    teams: teams.count ?? 0,
    invitations: invitations.count ?? 0,
    users: users.count ?? 0,
    enabledModules: modules.count ?? 0,
    activeGeofences: geofences.count ?? 0,
  };
}

export default async function CustomerOnboardingPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/customer-login');

  if (!isSupabaseConfigured()) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003."
      />
    );
  }

  let counts: OnboardingCounts | null = null;
  try {
    counts = await loadCounts(session.companyId);
  } catch (error) {
    console.error('Could not read setup checklist counts', error);
    counts = null;
  }

  if (!counts) {
    return (
      <ConfigNotice
        title="Setup data is unavailable"
        body="The checklist could not read teams, invitations, people, modules, or geofences. Apply migrations 001–003 and confirm the service role key."
      />
    );
  }

  return <OnboardingChecklist counts={counts} steps={onboardingSteps(counts)} />;
}
