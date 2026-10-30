import { isPlatformOwner, type OwnerClaim } from '@/lib/owner/guard';

export type TenantStatus = 'active' | 'suspended';

export function readSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

export function tenantStatus(settings: unknown): TenantStatus {
  return readSettings(settings).status === 'suspended' ? 'suspended' : 'active';
}

export function mergeTenantStatus(
  settings: unknown,
  status: TenantStatus,
  actorId: string,
  now = new Date().toISOString(),
): Record<string, unknown> {
  const next = readSettings(settings);
  next.status = status;
  if (status === 'suspended') {
    next.suspendedAt = now;
    next.suspendedBy = actorId;
    return next;
  }
  next.reactivatedAt = now;
  next.reactivatedBy = actorId;
  return next;
}

/** Suspended businesses stay closed for everyone except a platform owner. */
export function loginAllowed(claim: OwnerClaim, settings: unknown): boolean {
  if (tenantStatus(settings) !== 'suspended') return true;
  return isPlatformOwner(claim);
}

export function moduleNameList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length <= 100);
}

/** Search text used inside a PostgREST `or` filter. Drops characters that change the filter. */
export function sanitizeSearch(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().toLowerCase().slice(0, 80).replace(/[^a-z0-9 -]/g, '').trim();
}

export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://')) return null;
  if (value.startsWith('/owner') || value.startsWith('/customer')) return value;
  return null;
}

export function isMissingRelation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === '42P01' || code === 'PGRST205') return true;
  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find the table')
  );
}

export function signupBuckets(
  dates: readonly string[],
  days: number,
  now = new Date(),
): { date: string; signups: number }[] {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const keys: string[] = [];
  for (let index = 0; index < days; index += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    keys.push(day.toISOString().slice(0, 10));
  }
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const value of dates) {
    const key = value.slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, signups: counts.get(date) ?? 0 }));
}

export function summarizeBilling(
  rows: readonly { planCode: string; status: string }[] | null,
): {
  available: boolean;
  byPlan: { plan: string; count: number }[];
  byStatus: { status: string; count: number }[];
} {
  if (!rows) return { available: false, byPlan: [], byStatus: [] };
  const plans = new Map<string, number>();
  const statuses = new Map<string, number>();
  for (const row of rows) {
    const plan = row.planCode || 'unknown';
    const status = row.status || 'unknown';
    plans.set(plan, (plans.get(plan) ?? 0) + 1);
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
  }
  const sorted = (map: Map<string, number>) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    available: true,
    byPlan: sorted(plans).map(([plan, count]) => ({ plan, count })),
    byStatus: sorted(statuses).map(([status, count]) => ({ status, count })),
  };
}

export function latestByCompany<T extends { companyId: string; createdAt: string }>(rows: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const previous = map.get(row.companyId);
    if (!previous || previous.createdAt < row.createdAt) map.set(row.companyId, row);
  }
  return map;
}
