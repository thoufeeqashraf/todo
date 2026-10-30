export function formatStamp(value: string | null | undefined) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  return new Date(time).toLocaleString();
}

export function taskSparkline(dates: readonly (string | null | undefined)[], now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    return {
      day: day.toLocaleDateString(undefined, { weekday: 'short' }),
      count: dates.reduce((total, value) => {
        if (typeof value !== 'string' || value.length < 10) return total;
        return value.slice(0, 10) === key ? total + 1 : total;
      }, 0),
    };
  });
}

export function taskStatusSeries(statuses: readonly (string | null | undefined)[]) {
  const counts = new Map<string, number>();
  for (const status of statuses) {
    const key = status && status.length > 0 ? status : 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([status, count]) => ({
    status: status.replaceAll('_', ' '),
    count,
  }));
}

/** Which home-page feeds are allowed for this role once module names are known. */
export function homeFeedPlan(enabled: Iterable<string>, role: string) {
  const names = new Set(enabled);
  const seeCompany = role === 'admin' || role === 'manager';
  return {
    seeCompany,
    tasks: names.has('tasks'),
    locations: seeCompany && names.has('find_my_staff'),
    notifications: !seeCompany && names.has('notifications'),
    team: seeCompany,
    audit: seeCompany,
  };
}
