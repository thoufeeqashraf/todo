import 'server-only';

import { cache } from 'react';
import { forbidden, unauthorized } from 'next/navigation';

import { getCustomerSession } from '@/lib/customer-session';
import { authorizeCustomerSession } from '@/lib/owner/access';
import type { OwnerIdentity } from '@/lib/owner/guard';
import { isSupabaseConfigured } from '@/lib/supabase';

export const requirePageOwner = cache(async (): Promise<OwnerIdentity & { configured: boolean }> => {
  const auth = await authorizeCustomerSession(await getCustomerSession());
  if (!auth.ok) {
    if (auth.status === 401) unauthorized();
    forbidden();
  }
  return { ...auth.owner, configured: isSupabaseConfigured() };
});
