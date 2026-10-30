import 'server-only';

import type { OwnerPageClaim } from '@/lib/owner/page-access';
import { supabaseOwnerStore } from '@/lib/owner/supabase-store';
import { actorFromToken } from '@/lib/services/tenant';
import { supabaseAdmin } from '@/lib/supabase';

export async function resolveOwnerPageClaim(token: string): Promise<OwnerPageClaim | null> {
  try {
    const actor = await actorFromToken(token);
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, email, role, company_id')
      .eq('id', actor.userId)
      .eq('company_id', actor.companyId)
      .maybeSingle();
    if (!data?.id || !data.email || !data.company_id) return null;
    let companySlug: string | null = null;
    try {
      companySlug = await supabaseOwnerStore.companySlug(actor.companyId);
    } catch {
      companySlug = null;
    }
    return {
      userId: String(data.id),
      email: String(data.email),
      role: String(data.role ?? ''),
      companyId: String(data.company_id),
      companySlug,
    };
  } catch {
    return null;
  }
}
