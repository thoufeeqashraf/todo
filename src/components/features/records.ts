export type ModuleLoad =
  | { ok: true; blurb: string; data: unknown }
  | { ok: false; error: string; code: string };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

export function payloadOf(state: ModuleLoad | null): Record<string, unknown> | null {
  if (!state?.ok || !isRecord(state.data)) return null;
  return state.data;
}

export function text(value: unknown, fallback = '—'): string {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`;
  return (letters || name.slice(0, 2) || '?').toUpperCase();
}

export function displayName(first: unknown, last: unknown, fallback?: unknown): string {
  const name = `${typeof first === 'string' ? first : ''} ${typeof last === 'string' ? last : ''}`.trim();
  if (name) return name;
  if (typeof fallback === 'string' && fallback.trim()) return fallback;
  return 'Unnamed';
}

export function formatWhen(value: unknown, withTime = true): string {
  if (typeof value !== 'string' || value.length === 0) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', withTime
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function money(cents: unknown): string {
  const amount = typeof cents === 'number' ? cents : Number(cents);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount / 100);
}

export function shortId(value: unknown): string {
  const raw = text(value, '');
  if (!raw) return '—';
  return raw.length > 10 ? `${raw.slice(0, 8)}…` : raw;
}

export function messageOf(value: unknown): string {
  if (!isRecord(value)) return '';
  return typeof value.message === 'string' ? value.message : '';
}
