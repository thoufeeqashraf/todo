import 'server-only';

import { NextResponse } from 'next/server';

import { getCustomerSession } from '@/lib/customer-session';
import { authorizeOwner, isPlatformOwner } from '@/lib/owner/guard';
import { takeOwnerSlot } from '@/lib/owner/rate';
import { executeOwner, type OwnerResult } from '@/lib/owner/service';
import { supabaseOwnerStore } from '@/lib/owner/supabase-store';
import { clientAddress, type RateLimitDecision } from '@/lib/rate-limit';
import { readJson, RequestGuardError } from '@/lib/request-guards';
import { isSupabaseConfigured } from '@/lib/supabase';

const NOT_CONFIGURED = {
  error: {
    code: 'not_configured',
    message: 'Database is not configured. Set the Supabase URL and service role, then apply migrations 001–003.',
  },
};

function rateHeaders(decision: RateLimitDecision): HeadersInit {
  return {
    'Cache-Control': 'no-store',
    'X-RateLimit-Limit': String(decision.limit),
    'X-RateLimit-Remaining': String(decision.remaining),
  };
}

async function callerSlug(companyId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await supabaseOwnerStore.companySlug(companyId);
  } catch {
    return null;
  }
}

export async function authorizeCustomerSession(session: {
  user: { id: string; email: string; role: string };
  companyId: string;
} | null) {
  if (!session) return authorizeOwner(null, null);
  const slug = await callerSlug(session.companyId);
  return authorizeOwner(
    {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      companyId: session.companyId,
    },
    slug,
  );
}

export async function sessionIsPlatformOwner(session: {
  user: { email: string; role: string };
  companyId: string;
}): Promise<boolean> {
  if (isPlatformOwner({ email: session.user.email, role: session.user.role, companySlug: null })) return true;
  if (session.user.role !== 'admin') return false;
  const slug = await callerSlug(session.companyId);
  return isPlatformOwner({ email: session.user.email, role: session.user.role, companySlug: slug });
}

function jsonResult(result: OwnerResult, decision: RateLimitDecision) {
  const headers = rateHeaders(decision);
  if (result.status === 429) {
    const retry = (result.body as { error?: { retryAfterSeconds?: number } }).error?.retryAfterSeconds;
    if (retry) return NextResponse.json(result.body, { status: 429, headers: { ...headers, 'Retry-After': String(retry) } });
  }
  return NextResponse.json(result.body, { status: result.status, headers });
}

export async function ownerApi(request: Request, method: string, parts: string[]) {
  const decision = takeOwnerSlot(clientAddress(request.headers));
  if (!decision.ok) {
    return NextResponse.json(
      { error: { code: 'rate_limited', message: 'Too many requests.', retryAfterSeconds: decision.retryAfterSeconds } },
      { status: 429, headers: { ...rateHeaders(decision), 'Retry-After': String(decision.retryAfterSeconds) } },
    );
  }
  try {
    const session = await getCustomerSession();
    const slug = session ? await callerSlug(session.companyId) : null;
    const auth = authorizeOwner(
      session
        ? {
            userId: session.user.id,
            email: session.user.email,
            role: session.user.role,
            companyId: session.companyId,
          }
        : null,
      slug,
    );
    if (!auth.ok) return jsonResult({ status: auth.status, body: { error: { code: auth.code, message: auth.message } } }, decision);
    if (!isSupabaseConfigured()) return jsonResult({ status: 503, body: NOT_CONFIGURED }, decision);
    const body = method === 'GET' || method === 'DELETE' ? undefined : await readJson(request);
    const url = new URL(request.url);
    const result = await executeOwner({
      auth,
      method,
      parts,
      searchParams: url.searchParams,
      body,
      store: supabaseOwnerStore,
    });
    return jsonResult(result, decision);
  } catch (error) {
    if (error instanceof RequestGuardError) {
      const code = error.status === 413 ? 'payload_too_large' : 'invalid';
      return jsonResult({ status: error.status, body: { error: { code, message: error.message } } }, decision);
    }
    console.error('owner api failed', error instanceof Error ? error.name : 'unknown');
    return jsonResult({ status: 500, body: { error: { code: 'internal', message: 'Internal server error.' } } }, decision);
  }
}
