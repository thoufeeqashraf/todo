import { createHash } from 'node:crypto';

import { z } from 'zod';

import { PlatformError } from './platform-error';

export const MAX_JSON_BYTES = 64 * 1024;
const MAX_BUCKETS = 2_000;
const MAX_JSON_DEPTH = 32;
const MAX_JSON_KEYS = 40;
const MAX_JSON_ITEMS = 500;

const TASK_STATUSES = new Set(['todo', 'in_progress', 'completed', 'overdue']);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
const IP_RE = /^[0-9a-fA-F:.]+$/;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export class RequestGuardError extends Error {
  readonly status: number;
  readonly retryAfter?: number;

  constructor(status: number, message: string, retryAfter?: number) {
    super(message);
    this.name = 'RequestGuardError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

type HeaderSource = { get(name: string): string | null };

export function clientAddress(request: { headers: HeaderSource }): string {
  const real = request.headers.get('x-real-ip')?.trim() ?? '';
  if (real.length <= 64 && IP_RE.test(real)) return real;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (forwarded.length <= 64 && IP_RE.test(forwarded)) return forwarded;
  return 'unknown';
}

export function resetRateLimits() {
  buckets.clear();
}

export function rateLimitSize() {
  return buckets.size;
}

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

export function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (!current) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const };
  }
  if (current.count >= limit) {
    return {
      ok: false as const,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true as const };
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const result = consumeRateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw new RequestGuardError(429, 'Too many requests. Try again shortly.', result.retryAfter);
  }
}

export function enforceAuthLogin(request: { headers: HeaderSource }) {
  const ip = clientAddress(request);
  enforceRateLimit(`login:ip:${ip}`, 10, 60_000);
  enforceRateLimit('login:global', 100, 60_000);
}

export function enforceAuthSignup(request: { headers: HeaderSource }) {
  const ip = clientAddress(request);
  enforceRateLimit(`signup:ip:${ip}`, 5, 60_000);
  enforceRateLimit('signup:global', 30, 60_000);
}

export function enforceAuthInvite(request: { headers: HeaderSource }) {
  const ip = clientAddress(request);
  enforceRateLimit(`invite:ip:${ip}`, 5, 60_000);
  enforceRateLimit('invite:global', 30, 60_000);
}

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function isBearerTokenShape(token: string) {
  return token.length === 43 && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function bearerStillValid(expiresAt: unknown, now = Date.now()) {
  if (typeof expiresAt !== 'string' && typeof expiresAt !== 'number') return false;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) && time > now;
}

export function isForeignCompany(actorCompanyId: string, recordCompanyId: unknown) {
  return typeof recordCompanyId !== 'string' || recordCompanyId.length === 0 || recordCompanyId !== actorCompanyId;
}

export function isIsoDateTime(value: string) {
  return value.length <= 40 && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

export function normalizeTaskStatus(value: string | null) {
  if (value === null || value === '') return undefined;
  if (value.length > 20 || !TASK_STATUSES.has(value)) return null;
  return value;
}

export function taskVisibilityFilter(userId: string) {
  if (!isUuid(userId)) throw new RequestGuardError(401, 'Not authenticated');
  return `assigned_to_id.eq.${userId},assigned_by_id.eq.${userId}`;
}

export const CUSTOMER_SESSION_COOKIE = 'customer_session';

export function customerCookieAllows(token: string | undefined) {
  return isBearerTokenShape(token ?? '');
}

function assertDeclaredLength(request: Request, maxBytes: number) {
  const declared = request.headers.get('content-length');
  if (declared === null) return;
  if (!/^\d+$/.test(declared)) throw new RequestGuardError(400, 'Invalid content length.');
  if (Number(declared) > maxBytes) throw new RequestGuardError(413, 'Request body is too large.');
}

async function readLimitedText(request: Request, maxBytes: number) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) throw new RequestGuardError(413, 'Request body is too large.');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
  reader.releaseLock();
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function assertSafeJson(value: unknown, depth: number) {
  if (depth > MAX_JSON_DEPTH) throw new RequestGuardError(400, 'Invalid input data');
  if (typeof value === 'string') {
    if (value.includes('\0')) throw new RequestGuardError(400, 'Invalid input data');
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_JSON_ITEMS) throw new RequestGuardError(400, 'Invalid input data');
    for (const item of value) assertSafeJson(item, depth + 1);
    return;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > MAX_JSON_KEYS) throw new RequestGuardError(400, 'Invalid input data');
    for (const [, item] of entries) assertSafeJson(item, depth + 1);
  }
}

export async function readJson(request: Request, maxBytes = MAX_JSON_BYTES): Promise<unknown> {
  assertDeclaredLength(request, maxBytes);
  const text = await readLimitedText(request, maxBytes);
  if (!text.trim()) throw new RequestGuardError(400, 'Invalid JSON.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new RequestGuardError(400, 'Invalid JSON.');
  }
  assertSafeJson(parsed, 0);
  return parsed;
}

export function webError(error: unknown): {
  status: number;
  body: { error: string; code?: string };
  headers?: HeadersInit;
} | null {
  if (error instanceof RequestGuardError) {
    return {
      status: error.status,
      body: { error: error.message },
      headers: error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : undefined,
    };
  }
  if (error instanceof z.ZodError) {
    return { status: 400, body: { error: 'Invalid input data' } };
  }
  if (error instanceof PlatformError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }
  return null;
}

