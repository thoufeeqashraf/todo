export function personName(first: string | null, last: string | null, fallback = '—') {
  const name = `${first ?? ''} ${last ?? ''}`.trim();
  return name || fallback;
}

export function formatWhen(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function shortId(value: string | null) {
  if (!value) return '';
  return value.slice(0, 8);
}

export function detailText(changes: Record<string, unknown> | null) {
  if (!changes) return '—';
  const parts = Object.entries(changes)
    .slice(0, 4)
    .map(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return `${key}: ${value}`;
      }
      return key;
    });
  return parts.join(' · ') || '—';
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asText(value: unknown): string | null {
  if (typeof value === 'string') return value.length > 0 ? value : null;
  if (value == null) return null;
  return String(value);
}
