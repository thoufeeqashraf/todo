import 'server-only';
import { cookies } from 'next/headers';

import { PlatformError } from '@/lib/platform-error';
import { CUSTOMER_SESSION_COOKIE } from '@/lib/request-guards';
import { actorFromToken } from '@/lib/services/tenant';
import { supabaseAdmin } from '@/lib/supabase';
import type { User } from '@/types';

const SESSION_COOKIE_NAME = CUSTOMER_SESSION_COOKIE;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

export interface CustomerSession {
  user: User;
  companyId: string;
}

export async function setCustomerToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions);
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const actor = await actorFromToken(token);
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, company_id, email, first_name, last_name, role, is_active, created_at, updated_at')
      .eq('id', actor.userId)
      .eq('company_id', actor.companyId)
      .maybeSingle();
    if (!data) return null;
    return { user: data as User, companyId: actor.companyId };
  } catch {
    return null;
  }
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 });
}

export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) {
    throw new PlatformError('unauthorized', 'Not authenticated', 401);
  }
  return session;
}
