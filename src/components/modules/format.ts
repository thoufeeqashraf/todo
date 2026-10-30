import type { DirectoryPerson } from '@/components/modules/types';

export function personName(
  person: Pick<DirectoryPerson, 'first_name' | 'last_name' | 'email'> | undefined,
  fallback = 'Unknown',
) {
  if (!person) return fallback;
  const name = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim();
  return name || person.email || fallback;
}

export function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return letters || '·';
}

export function indexPeople(people: DirectoryPerson[]) {
  return new Map(people.map((person) => [person.id, person]));
}

export function formatWhen(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatMoney(cents: number, currency = 'ZAR') {
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export function formatPoint(value: unknown) {
  if (!value || typeof value !== 'object') return '—';
  const point = value as { lat?: unknown; lng?: unknown };
  if (typeof point.lat !== 'number' || typeof point.lng !== 'number') return '—';
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return '—';
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export function formatOrderItems(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) return '—';
  const labels = items
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const row = item as { name?: unknown; qty?: unknown };
      const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : 'Item';
      const qty = typeof row.qty === 'number' && Number.isFinite(row.qty) ? row.qty : 1;
      return `${qty} x ${name}`;
    })
    .filter(Boolean);
  return labels.length > 0 ? labels.join(', ') : '—';
}

export function matchesQuery(query: string, parts: Array<string | null | undefined>) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => (part ?? '').toLowerCase().includes(needle));
}

export function finiteNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
