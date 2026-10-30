import { redirect } from 'next/navigation';

import { AdminGate } from '@/components/admin/admin-gate';
import { loadTeam } from '@/components/admin/load';
import { PageHeader } from '@/components/admin/page-header';
import { TeamManager } from '@/components/admin/team-manager';
import { ConfigNotice } from '@/components/config-notice';
import { getCustomerSession } from '@/lib/customer-session';
import { isSupabaseConfigured } from '@/lib/supabase';

export const instant = false;

export default async function TeamPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/customer-login');
  if (session.user.role !== 'admin') return <AdminGate title="Team" />;
  if (!isSupabaseConfigured()) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003."
      />
    );
  }

  const { members, invitations, error } = await loadTeam(session.companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Team"
        description="People in this company, the role on each account, and invitations. New invites post to the existing invitation API."
      />
      <TeamManager members={members} invitations={invitations} error={error} />
    </div>
  );
}
