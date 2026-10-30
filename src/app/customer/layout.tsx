import type { ReactNode } from 'react';

import { ConfigNotice } from '@/components/config-notice';
import { CustomerShell } from '@/components/customer-shell';
import { getCustomerSession } from '@/lib/customer-session';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

export const instant = false;

function nameFrom(session: { user: { first_name?: string | null; last_name?: string | null } }) {
  return `${session.user.first_name ?? ''} ${session.user.last_name ?? ''}`.trim();
}

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await getCustomerSession();
  if (!session) return children;

  if (!isSupabaseConfigured()) {
    return (
      <CustomerShell companyName="Workspace" industry="" email={session.user.email} role={session.user.role} name={nameFrom(session)}>
        <ConfigNotice
          title="Database is not configured"
          body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003."
        />
      </CustomerShell>
    );
  }

  let companyName = 'Company';
  let industry = '';
  try {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('name, industries(display_name)')
      .eq('id', session.companyId)
      .maybeSingle();
    if (!error && data && typeof data === 'object') {
      const row = data as { name?: string; industries?: { display_name?: string } | { display_name?: string }[] | null };
      companyName = row.name || companyName;
      const industries = row.industries;
      industry = Array.isArray(industries) ? industries[0]?.display_name || '' : industries?.display_name || '';
    }
  } catch {
    companyName = 'Workspace';
  }

  const name = nameFrom(session);

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
