import { redirect } from 'next/navigation';

import { AdminGate } from '@/components/admin/admin-gate';
import { loadBillingRecords } from '@/components/admin/billing-data';
import { buildPlanViews } from '@/components/admin/billing-format';
import { BillingPanel } from '@/components/admin/billing-panel';
import { loadBillingUsage } from '@/components/admin/load';
import { PageHeader } from '@/components/admin/page-header';
import { ConfigNotice } from '@/components/config-notice';
import { getCustomerSession } from '@/lib/customer-session';
import { isSupabaseConfigured } from '@/lib/supabase';

export const instant = false;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect('/customer-login');
  if (session.user.role !== 'admin') return <AdminGate title="Billing" />;
  if (!isSupabaseConfigured()) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–005."
      />
    );
  }

  const params = await searchParams;
  const checkout = params.checkout === 'success' || params.checkout === 'cancelled' ? params.checkout : null;
  const [usage, records] = await Promise.all([
    loadBillingUsage(session.companyId),
    loadBillingRecords(session.companyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Billing"
        description="Plan, subscription, and invoices for this company. Subscribe and Upgrade open Stripe Checkout. The wallet is unchanged."
      />
      <BillingPanel
        usage={usage}
        plans={buildPlanViews(
          records.subscription
            ? { planCode: records.subscription.planCode, status: records.subscription.status }
            : null,
        )}
        subscription={records.subscription}
        subscriptionState={records.subscriptionState}
        invoices={records.invoices}
        invoicesState={records.invoicesState}
        checkout={checkout}
      />
    </div>
  );
}
