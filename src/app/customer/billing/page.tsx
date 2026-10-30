import { redirect } from 'next/navigation';

import { AdminGate } from '@/components/admin/admin-gate';
import { BillingPanel } from '@/components/admin/billing-panel';
import { loadBillingUsage } from '@/components/admin/load';
import { PageHeader } from '@/components/admin/page-header';
import { ConfigNotice } from '@/components/config-notice';
import { getCustomerSession } from '@/lib/customer-session';
import { isSupabaseConfigured } from '@/lib/supabase';

export const instant = false;

export default async function BillingPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/customer-login');
  if (session.user.role !== 'admin') return <AdminGate title="Billing" />;
  if (!isSupabaseConfigured()) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003."
      />
    );
  }

  const usage = await loadBillingUsage(session.companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Billing"
        description="Plan, usage, and invoices for this company. This screen is not connected to a payment provider."
      />
      <BillingPanel usage={usage} />
    </div>
  );
}
