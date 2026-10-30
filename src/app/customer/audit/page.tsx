import { redirect } from 'next/navigation';

import { AdminGate } from '@/components/admin/admin-gate';
import { AuditLog } from '@/components/admin/audit-log';
import { loadAuditEntries } from '@/components/admin/load';
import { PageHeader } from '@/components/admin/page-header';
import { ConfigNotice } from '@/components/config-notice';
import { getCustomerSession } from '@/lib/customer-session';
import { canViewAudit } from '@/lib/platform-rules';
import { isSupabaseConfigured } from '@/lib/supabase';

export const instant = false;

export default async function AuditPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/customer-login');
  if (!canViewAudit(session.user.role)) return <AdminGate title="Audit log" />;
  if (!isSupabaseConfigured()) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003."
      />
    );
  }

  const { entries, error } = await loadAuditEntries(session.companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Audit log"
        description="Events written for this company. Filters and search run on the latest rows from audit_logs."
      />
      <AuditLog entries={entries} error={error} />
    </div>
  );
}
