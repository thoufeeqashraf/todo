import { redirect } from 'next/navigation';

import { ConfigNotice } from '@/components/config-notice';
import { ClientsDirectory } from '@/components/expansion/clients-directory';
import { ModuleUnavailable } from '@/components/expansion/module-unavailable';
import { loadClients } from '@/components/expansion/queries';

export const instant = false;

export default async function ClientsPage() {
  const result = await loadClients();
  if (result.state === 'signed_out') redirect('/customer-login');
  if (result.state === 'unconfigured') {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003."
      />
    );
  }
  if (result.state === 'disabled') return <ModuleUnavailable title="Clients" message={result.message} />;
  if (result.state === 'error') return <ConfigNotice title="Clients are unavailable" body={result.message} />;
  return <ClientsDirectory data={result.data} />;
}
