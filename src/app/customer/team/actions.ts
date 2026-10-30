'use server';

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

import { dispatch } from '@/lib/api-v1';
import { getCustomerSession } from '@/lib/customer-session';

const CUSTOMER_SESSION_COOKIE = 'customer_session';
const INVITATION_ROUTE = '/api/v1/invitations';

type InviteRole = 'admin' | 'manager' | 'user';

function isInviteRole(value: string): value is InviteRole {
  return value === 'admin' || value === 'manager' || value === 'user';
}

export async function createTeamInvitation(email: string, role: string) {
  const session = await getCustomerSession();
  if (!session) return { ok: false as const, error: 'Sign in again.' };
  if (session.user.role !== 'admin') {
    return { ok: false as const, error: 'Only an admin can invite from this page.' };
  }
  if (!isInviteRole(role)) {
    return { ok: false as const, error: 'Choose admin, manager, or user.' };
  }

  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return { ok: false as const, error: 'Sign in again.' };

  const request = new NextRequest(`http://internal${INVITATION_ROUTE}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, role }),
  });
  const response = await dispatch(request, ['invitations'], 'POST');
  const payload = (await response.json()) as {
    invitePath?: string;
    emailSent?: boolean;
    error?: { message?: string };
  };

  if (!response.ok) {
    return { ok: false as const, error: payload.error?.message || 'Could not create the invitation.' };
  }

  return {
    ok: true as const,
    invitePath: payload.invitePath ?? '',
    emailSent: payload.emailSent === true,
  };
}
