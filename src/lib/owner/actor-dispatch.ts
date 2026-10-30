import 'server-only';

import { authorizeOwner } from '@/lib/owner/guard';
import { executeOwner, type OwnerResult } from '@/lib/owner/service';
import { supabaseOwnerStore } from '@/lib/owner/supabase-store';
import { isSupabaseConfigured } from '@/lib/supabase';

export async function dispatchOwnerActor(input: {
  userId: string;
  email: string;
  role: string;
  companyId: string;
  method: string;
  parts: readonly string[];
  searchParams: URLSearchParams;
  body: unknown;
}): Promise<OwnerResult> {
  let slug: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      slug = await supabaseOwnerStore.companySlug(input.companyId);
    } catch {
      slug = null;
    }
  }
  const auth = authorizeOwner(
    { userId: input.userId, email: input.email, role: input.role, companyId: input.companyId },
    slug,
  );
  if (!auth.ok) return { status: auth.status, body: { error: { code: auth.code, message: auth.message } } };
  if (!isSupabaseConfigured()) {
    return {
      status: 503,
      body: {
        error: {
          code: 'not_configured',
          message: 'Database is not configured. Set the Supabase URL and service role, then apply migrations 001–003.',
        },
      },
    };
  }
  return executeOwner({
    auth,
    method: input.method,
    parts: input.parts,
    searchParams: input.searchParams,
    body: input.body,
    store: supabaseOwnerStore,
  });
}
