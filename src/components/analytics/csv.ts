import type { AnalyticsSnapshot } from '@/components/analytics/aggregate';

function cell(value: string | number): string {
  const raw = String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

function line(values: Array<string | number>): string {
  return values.map(cell).join(',');
}

export function analyticsToCsv(snapshot: AnalyticsSnapshot): string {
  const rows = [
    line(['section', 'metric', 'value', 'delta']),
    ...snapshot.kpis.map((kpi) => line(['kpi', kpi.label, kpi.value, kpi.deltaLabel])),
    '',
    line(['section', 'date', 'completed', 'created']),
    ...snapshot.completion.map((point) => line(['completion', point.date, point.completed, point.created])),
    '',
    line(['section', 'date', 'overdue']),
    ...snapshot.overdueSeries.map((point) => line(['overdue', point.date, point.overdue])),
    '',
    line(['section', 'assignee', 'open']),
    ...snapshot.workload.map((point) => line(['workload', point.name, point.open])),
    '',
    line(['section', 'date', 'present', 'recorded', 'rate_percent']),
    ...snapshot.attendance.map((point) => line([
      'attendance',
      point.date,
      point.present,
      point.recorded,
      point.rate ?? '',
    ])),
    '',
    line(['section', 'severity', 'count']),
    ...snapshot.severity.map((point) => line(['severity', point.severity, point.count])),
    '',
    line(['section', 'task', 'assignee', 'due']),
    ...snapshot.overdueTasks.map((task) => line(['overdue_task', task.title, task.assignee, task.due])),
  ];
  return `${rows.join('\n')}\n`;
}
