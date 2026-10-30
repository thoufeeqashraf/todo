import type { ReactNode } from 'react';

import { CustomerShell } from '@/components/customer-shell';
import { getCustomerSession } from '@/lib/customer-session';
import { supabaseAdmin } from '@/lib/supabase';

export const instant = false;

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await getCustomerSession();
  if (!session) return children;

  let companyName = 'Company';
  let industry = '';
  const { data } = await supabaseAdmin
    .from('companies')
    .select('name, industries(display_name)')
    .eq('id', session.companyId)
    .maybeSingle();
  if (data && typeof data === 'object') {
    const row = data as { name?: string; industries?: { display_name?: string } | { display_name?: string }[] | null };
    companyName = row.name || companyName;
    const industries = row.industries;
    industry = Array.isArray(industries) ? industries[0]?.display_name || '' : industries?.display_name || '';
  }

  const name = `${session.user.first_name ?? ''} ${session.user.last_name ?? ''}`.trim();

  return (
    <CustomerShell
      companyName={companyName}
      industry={industry}
      email={session.user.email}
      role={session.user.role}
      name={name}
    >
      {children}
    </CustomerShell>
  );
}
