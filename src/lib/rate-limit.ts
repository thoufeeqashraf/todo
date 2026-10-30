export interface RateLimitDecision {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function resetRateLimits() {
  buckets.clear();
}

export function clientAddress(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip')?.trim();
  return realIp || 'local';
}

export function rateLimitPolicy(path: readonly string[]): { limit: number; windowMs: number; bucket: string } {
  const joined = path.join('/');
  if (joined === 'auth/login' || joined === 'auth/logout' || joined === 'invitations/accept') {
    return { limit: 10, windowMs: 60_000, bucket: 'auth' };
  }
  return { limit: 120, windowMs: 60_000, bucket: 'api' };
}

export function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitDecision {
  if (buckets.size > 5000) {
    for (const [id, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(id);
    }
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  if (current.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}
