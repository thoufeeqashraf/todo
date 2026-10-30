import { redirect } from 'next/navigation';

import { ConfigNotice } from '@/components/config-notice';
import { ModuleUnavailable } from '@/components/expansion/module-unavailable';
import { NotificationsInbox } from '@/components/expansion/notifications-inbox';
import { loadInbox } from '@/components/expansion/queries';

export const instant = false;

export default async function NotificationsPage() {
  const result = await loadInbox();
  if (result.state === 'signed_out') redirect('/customer-login');
  if (result.state === 'unconfigured') {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003."
      />
    );
  }
  if (result.state === 'disabled') return <ModuleUnavailable title="Notifications" message={result.message} />;
  if (result.state === 'error') return <ConfigNotice title="Notifications are unavailable" body={result.message} />;
  return <NotificationsInbox items={result.data} />;
}
