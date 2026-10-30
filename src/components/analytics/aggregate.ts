import { dayOf, eachDay, formatDayLabel, type AnalyticsRange } from '@/components/analytics/range';

export type { AnalyticsRange } from '@/components/analytics/range';

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assigned_to_id: string | null;
  created_at: string;
  completed_at: string | null;
};

export type AttendanceRow = {
  user_id: string;
  status: string;
  clock_in: string | null;
  created_at: string;
};

export type IncidentRow = {
  status: string;
  created_at: string;
};

export type Person = {
  id: string;
  name: string;
};

export type KpiTone = 'good' | 'bad' | 'neutral';

export type AnalyticsKpi = {
  id: 'completed' | 'overdue' | 'attendance' | 'incidents';
  label: string;
  value: string;
  hint: string;
  delta: number | null;
  deltaLabel: string;
  tone: KpiTone;
};

export type TrendPoint = { date: string; label: string; completed: number; created: number };
export type OverduePoint = { date: string; label: string; overdue: number };
export type WorkloadPoint = { name: string; open: number };
export type AttendancePoint = {
  date: string;
  label: string;
  present: number;
  recorded: number;
  rate: number | null;
};
export type SeverityPoint = { severity: string; count: number };
export type OverdueTask = { id: string; title: string; due: string; assignee: string };

export type AnalyticsSnapshot = {
  range: AnalyticsRange;
  scope: 'company' | 'own';
  comparisonDays: number;
  truncated: boolean;
  kpis: AnalyticsKpi[];
  completion: TrendPoint[];
  overdueSeries: OverduePoint[];
  overdueTasks: OverdueTask[];
  workload: WorkloadPoint[];
  attendance: AttendancePoint[];
  severity: SeverityPoint[];
};

const SEVERITY_LABELS = [
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'unspecified', label: 'Unspecified' },
] as const;

export type SeverityId = (typeof SEVERITY_LABELS)[number]['id'];

const PRESENT = new Set(['clocked_in', 'clocked_out', 'late']);
const ABSENT = new Set(['absent']);

export function incidentSeverity(status: string): SeverityId {
  const value = status.trim().toLowerCase().replace(/[\s-]+/g, '');
  if (['critical', 'sev1', 'urgent', 'emergency'].includes(value)) return 'critical';
  if (['high', 'sev2', 'major'].includes(value)) return 'high';
  if (['medium', 'sev3', 'moderate'].includes(value)) return 'medium';
  if (['low', 'sev4', 'minor', 'info'].includes(value)) return 'low';
  return 'unspecified';
}

export function relativeDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function pointDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return (current - previous) * 100;
}

function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function formatDelta(delta: number | null, unit: 'percent' | 'points'): string {
  if (delta === null) return 'No prior baseline';
  const rounded = round1(delta);
  const sign = rounded > 0 ? '+' : '';
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return unit === 'points' ? `${sign}${body} pts` : `${sign}${body}%`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  const pct = round1(rate * 100);
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

function inRange(day: string | null, from: string, to: string): day is string {
  return day !== null && day >= from && day <= to;
}

function timeOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function endTime(day: string): number {
  return Date.parse(`${day}T23:59:59.999Z`);
}

function existedBy(task: TaskRow, day: string): boolean {
  const created = dayOf(task.created_at);
  return created !== null && created <= day;
}

function isCompletedBy(task: TaskRow, day: string): boolean {
  const completed = timeOf(task.completed_at);
  if (completed !== null) return completed <= endTime(day);
  return task.status === 'completed';
}

export function isOverdueOn(task: TaskRow, day: string): boolean {
  if (!existedBy(task, day) || isCompletedBy(task, day)) return false;
  if (task.status === 'overdue') return true;
  const due = timeOf(task.due_date);
  return due !== null && due <= endTime(day);
}

export function isOpenOn(task: TaskRow, day: string): boolean {
  return existedBy(task, day) && !isCompletedBy(task, day);
}

function toneFor(direction: 'up-good' | 'up-bad', delta: number | null): KpiTone {
  if (delta === null || delta === 0) return 'neutral';
  const rose = delta > 0;
  if (direction === 'up-good') return rose ? 'good' : 'bad';
  return rose ? 'bad' : 'good';
}

function attendanceStamp(row: AttendanceRow): string | null {
  return dayOf(row.clock_in) ?? dayOf(row.created_at);
}

function attendanceTotals(rows: AttendanceRow[], from: string, to: string) {
  let present = 0;
  let recorded = 0;
  for (const row of rows) {
    const day = attendanceStamp(row);
    if (!inRange(day, from, to)) continue;
    if (PRESENT.has(row.status)) {
      present += 1;
      recorded += 1;
    } else if (ABSENT.has(row.status)) {
      recorded += 1;
    }
  }
  return { present, recorded, rate: recorded === 0 ? null : present / recorded };
}

export function buildSnapshot(input: {
  range: AnalyticsRange;
  scope: 'company' | 'own';
  tasks: TaskRow[];
  attendance: AttendanceRow[];
  incidents: IncidentRow[];
  people: Person[];
  truncated: boolean;
}): AnalyticsSnapshot {
  const { range, tasks, attendance, incidents, people } = input;
  const days = eachDay(range.from, range.to);
  const names = new Map(people.map((person) => [person.id, person.name]));
  const completedByDay = new Map<string, number>();
  const createdByDay = new Map<string, number>();
  let completedCurrent = 0;
  let completedPrevious = 0;

  for (const task of tasks) {
    const completed = dayOf(task.completed_at);
    if (inRange(completed, range.from, range.to)) {
      completedCurrent += 1;
      completedByDay.set(completed, (completedByDay.get(completed) ?? 0) + 1);
    } else if (inRange(completed, range.previousFrom, range.previousTo)) {
      completedPrevious += 1;
    }
    const created = dayOf(task.created_at);
    if (inRange(created, range.from, range.to)) {
      createdByDay.set(created, (createdByDay.get(created) ?? 0) + 1);
    }
  }

  let overdueCurrent = 0;
  let overduePrevious = 0;
  const overdueTasks: OverdueTask[] = [];
  for (const task of tasks) {
    if (isOverdueOn(task, range.to)) {
      overdueCurrent += 1;
      overdueTasks.push({
        id: task.id,
        title: task.title,
        due: dayOf(task.due_date) ?? 'No due date',
        assignee: task.assigned_to_id ? names.get(task.assigned_to_id) ?? 'Former staff' : 'Unassigned',
      });
    }
    if (isOverdueOn(task, range.previousTo)) overduePrevious += 1;
  }
  overdueTasks.sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));

  const openCounts = new Map<string, number>();
  for (const task of tasks) {
    if (!isOpenOn(task, range.to)) continue;
    const key = task.assigned_to_id ?? '';
    openCounts.set(key, (openCounts.get(key) ?? 0) + 1);
  }
  const workloadRows = [...openCounts.entries()]
    .map(([id, open]) => ({
      name: id ? names.get(id) ?? 'Former staff' : 'Unassigned',
      open,
    }))
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
  const workload = workloadRows.length > 8
    ? [
        ...workloadRows.slice(0, 8),
        { name: 'Others', open: workloadRows.slice(8).reduce((sum, row) => sum + row.open, 0) },
      ]
    : workloadRows;

  const nowAttendance = attendanceTotals(attendance, range.from, range.to);
  const thenAttendance = attendanceTotals(attendance, range.previousFrom, range.previousTo);
  const attendanceSeries = days.map((date) => {
    let present = 0;
    let recorded = 0;
    for (const row of attendance) {
      if (attendanceStamp(row) !== date) continue;
      if (PRESENT.has(row.status)) {
        present += 1;
        recorded += 1;
      } else if (ABSENT.has(row.status)) {
        recorded += 1;
      }
    }
    return {
      date,
      label: formatDayLabel(date),
      present,
      recorded,
      rate: recorded === 0 ? null : round1((present / recorded) * 100),
    };
  });

  const severityCounts: Record<SeverityId, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unspecified: 0,
  };
  let incidentsCurrent = 0;
  let incidentsPrevious = 0;
  for (const incident of incidents) {
    const created = dayOf(incident.created_at);
    if (inRange(created, range.from, range.to)) {
      incidentsCurrent += 1;
      severityCounts[incidentSeverity(incident.status)] += 1;
    } else if (inRange(created, range.previousFrom, range.previousTo)) {
      incidentsPrevious += 1;
    }
  }

  const completedDelta = relativeDelta(completedCurrent, completedPrevious);
  const overdueDelta = relativeDelta(overdueCurrent, overduePrevious);
  const attendanceDelta = pointDelta(nowAttendance.rate, thenAttendance.rate);
  const incidentDelta = relativeDelta(incidentsCurrent, incidentsPrevious);

  return {
    range,
    scope: input.scope,
    comparisonDays: days.length,
    truncated: input.truncated,
    kpis: [
      {
        id: 'completed',
        label: 'Tasks completed',
        value: formatCount(completedCurrent),
        hint: 'Finished in this range',
        delta: completedDelta,
        deltaLabel: formatDelta(completedDelta, 'percent'),
        tone: toneFor('up-good', completedDelta),
      },
      {
        id: 'overdue',
        label: 'Overdue',
        value: formatCount(overdueCurrent),
        hint: 'Still late at the end of the range',
        delta: overdueDelta,
        deltaLabel: formatDelta(overdueDelta, 'percent'),
        tone: toneFor('up-bad', overdueDelta),
      },
      {
        id: 'attendance',
        label: 'Attendance',
        value: formatRate(nowAttendance.rate),
        hint: 'Present, including late, out of decided records',
        delta: attendanceDelta,
        deltaLabel: formatDelta(attendanceDelta, 'points'),
        tone: toneFor('up-good', attendanceDelta),
      },
      {
        id: 'incidents',
        label: 'Incidents',
        value: formatCount(incidentsCurrent),
        hint: 'Opened in this range',
        delta: incidentDelta,
        deltaLabel: formatDelta(incidentDelta, 'percent'),
        tone: toneFor('up-bad', incidentDelta),
      },
    ],
    completion: days.map((date) => ({
      date,
      label: formatDayLabel(date),
      completed: completedByDay.get(date) ?? 0,
      created: createdByDay.get(date) ?? 0,
    })),
    overdueSeries: days.map((date) => ({
      date,
      label: formatDayLabel(date),
      overdue: tasks.reduce((sum, task) => sum + (isOverdueOn(task, date) ? 1 : 0), 0),
    })),
    overdueTasks: overdueTasks.slice(0, 8),
    workload,
    attendance: attendanceSeries,
    severity: SEVERITY_LABELS.map((item) => ({ severity: item.label, count: severityCounts[item.id] })),
  };
}
