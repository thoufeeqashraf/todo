import 'server-only';
import { cookies } from 'next/headers';
import { User } from '@/types';

const SESSION_COOKIE_NAME = 'customer_session';

export interface CustomerSession {
  user: User;
  companyId: string;
}

export async function setCustomerSession(session: CustomerSession) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie) {
    return null;
  }

  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  return session;
}
