export type AnalyticsRange = {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
};

const DAY_MS = 86_400_000;
const MAX_SPAN_DAYS = 365;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function parseDay(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daySpan(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to && days.length < MAX_SPAN_DAYS + 1) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function resolveRange(input: { from?: string; to?: string; now?: Date } = {}): AnalyticsRange {
  const today = todayUtc(input.now ?? new Date());
  let to = parseDay(input.to) ?? today;
  let from = parseDay(input.from) ?? addDays(to, -29);
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  if (daySpan(from, to) > MAX_SPAN_DAYS) from = addDays(to, -MAX_SPAN_DAYS);
  const length = daySpan(from, to);
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -length);
  return { from, to, previousFrom, previousTo };
}

export function formatDayLabel(day: string): string {
  const [, month, date] = day.split('-');
  return `${Number(date)} ${MONTHS[Number(month) - 1]}`;
}

export function formatRangeLabel(from: string, to: string): string {
  const long = (day: string) => {
    const [year, month, date] = day.split('-');
    return `${Number(date)} ${MONTHS[Number(month) - 1]} ${year}`;
  };
  return `${long(from)} – ${long(to)}`;
}

export function dayOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}
