'use client';

import { Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { analyticsToCsv } from '@/components/analytics/csv';
import { addDays, formatRangeLabel } from '@/components/analytics/range';
import type { AnalyticsLoad } from '@/components/analytics/view';
import { ConfigNotice } from '@/components/config-notice';
import { EmptyState } from '@/components/empty-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from 'cn';

const presets = [
  { id: '7', label: '7d', days: 7 },
  { id: '30', label: '30d', days: 30 },
  { id: '90', label: '90d', days: 90 },
];

const severityColor: Record<string, string> = {
  Critical: 'var(--destructive)',
  High: 'color-mix(in oklch, var(--destructive) 62%, var(--foreground))',
  Medium: 'var(--primary)',
  Low: 'var(--chart-3)',
  Unspecified: 'var(--muted-foreground)',
};

const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 };

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: string | number; name?: string | number }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="text-muted-foreground">
          <span className="font-numeric text-foreground">{item.value ?? '—'}</span> {item.name}
        </p>
      ))}
    </div>
  );
}

function Panel({
  title,
  description,
  empty,
  children,
  label,
}: {
  title: string;
  description: string;
  empty: boolean;
  children: ReactNode;
  label: string;
}) {
  return (
    <Card className="min-w-0 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 text-center text-sm text-muted-foreground">
            Nothing in this range.
          </div>
        ) : (
          <div className="h-56 w-full" role="img" aria-label={label}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard({ result }: { result: AnalyticsLoad }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (result.state === 'unconfigured') {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003."
      />
    );
  }

  if (result.state === 'gated') {
    return (
      <EmptyState
        title="Reports is off"
        body={`${result.message} Turn the reports module on to open analytics.`}
        action={
          <Link href="/customer/modules" className={buttonVariants({ variant: 'outline' })}>
            Module settings
          </Link>
        }
      />
    );
  }

  if (result.state === 'error') {
    return <ConfigNotice title="Analytics is unavailable" body={result.message} />;
  }

  const { snapshot, today } = result;
  const hasCompletion = snapshot.completion.some((point) => point.completed > 0 || point.created > 0);
  const hasOverdue = snapshot.overdueSeries.some((point) => point.overdue > 0);
  const hasWorkload = snapshot.workload.some((point) => point.open > 0);
  const hasAttendance = snapshot.attendance.some((point) => point.recorded > 0);
  const hasIncidents = snapshot.severity.some((point) => point.count > 0);

  function apply(from: string, to: string) {
    const params = new URLSearchParams({ from, to });
    startTransition(() => {
      router.push(`/customer/analytics?${params.toString()}`);
    });
  }

  function exportCsv() {
    const csv = analyticsToCsv(snapshot);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${snapshot.range.from}-to-${snapshot.range.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const scopeLine = snapshot.scope === 'company'
    ? 'Company-wide operations.'
    : 'Your own tasks, attendance, and incidents.';

  return (
    <div className={cn('space-y-6', pending && 'opacity-70')} aria-busy={pending}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-1">
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Reports</p>
          <h1>Analytics</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {scopeLine} {formatRangeLabel(snapshot.range.from, snapshot.range.to)}. Compared with the previous {snapshot.comparisonDays} days. Dates use UTC.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((preset) => {
              const active = snapshot.range.to === today && snapshot.range.from === addDays(today, -(preset.days - 1));
              return (
                <Button
                  key={preset.id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  aria-pressed={active}
                  onClick={() => apply(addDays(today, -(preset.days - 1)), today)}
                >
                  {preset.label}
                </Button>
              );
            })}
            <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
              <Download />
              Export CSV
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label="Start date"
              value={snapshot.range.from}
              max={snapshot.range.to}
              className="w-[9.5rem] [color-scheme:light] dark:[color-scheme:dark]"
              onChange={(event) => {
                if (event.target.value) apply(event.target.value, snapshot.range.to);
              }}
            />
            <span className="text-muted-foreground" aria-hidden="true">–</span>
            <Input
              type="date"
              aria-label="End date"
              value={snapshot.range.to}
              min={snapshot.range.from}
              className="w-[9.5rem] [color-scheme:light] dark:[color-scheme:dark]"
              onChange={(event) => {
                if (event.target.value) apply(snapshot.range.from, event.target.value);
              }}
            />
          </div>
        </div>
      </header>

      {snapshot.truncated ? (
        <p className="text-xs text-muted-foreground">
          A source table returned 5,000 rows, so older rows may be missing. Narrow the range if a total looks short.
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.kpis.map((kpi) => (
          <Card key={kpi.id} className="bg-card/80 shadow-sm">
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="font-numeric text-2xl tracking-tight">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-muted-foreground">
              <span
                className={cn(
                  'font-numeric',
                  kpi.tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
                  kpi.tone === 'bad' && 'text-destructive',
                )}
              >
                {kpi.deltaLabel}
              </span>
              {kpi.delta === null ? `. ${kpi.hint}.` : ` vs the previous period. ${kpi.hint}.`}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Panel
            title="Task completion"
            description="Created and completed tasks each day."
            empty={!hasCompletion}
            label={`Task completion from ${snapshot.range.from} to ${snapshot.range.to}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshot.completion} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={axisTick} />
                <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} tick={axisTick} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--border)' }} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.16} strokeWidth={2} />
                <Area type="monotone" dataKey="created" name="Created" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.08} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>
        <Card className="min-w-0 bg-card/80 shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>Overdue tasks</CardTitle>
            <CardDescription>Open work past its due time, counted at the end of each day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasOverdue ? (
              <div className="h-40 w-full" role="img" aria-label={`Overdue tasks from ${snapshot.range.from} to ${snapshot.range.to}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={snapshot.overdueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={axisTick} />
                    <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} tick={axisTick} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--muted)', opacity: 0.45 }} />
                    <Bar dataKey="overdue" name="Overdue" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 text-center text-sm text-muted-foreground">
                Nothing in this range.
              </div>
            )}
            {snapshot.overdueTasks.length > 0 ? (
              <ul className="divide-y divide-border">
                {snapshot.overdueTasks.map((task) => (
                  <li key={task.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span className="truncate font-medium">{task.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{task.assignee} · {task.due}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Panel
          title="Staff workload"
          description="Open tasks at the end of the range, by assignee."
          empty={!hasWorkload}
          label="Open tasks by assignee"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={snapshot.workload} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis
                type="category"
                dataKey="name"
                width={108}
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                tickFormatter={(value: string) => (value.length > 16 ? `${value.slice(0, 15)}…` : value)}
              />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--muted)', opacity: 0.45 }} />
              <Bar dataKey="open" name="Open" fill="var(--primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel
          title="Attendance rate"
          description="Present records, including late, divided by present and absent. Pending records are left out."
          empty={!hasAttendance}
          label={`Attendance rate from ${snapshot.range.from} to ${snapshot.range.to}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snapshot.attendance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={axisTick} />
              <YAxis domain={[0, 100]} width={40} tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--border)' }} />
              <Line type="monotone" dataKey="rate" name="Rate %" stroke="var(--primary)" strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel
          title="Incidents by severity"
          description="Severity is read from incident status. Open and other workflow statuses count as unspecified."
          empty={!hasIncidents}
          label="Incident counts by severity"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={snapshot.severity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="severity" tickLine={false} axisLine={false} tick={axisTick} interval={0} />
              <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} tick={axisTick} />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--muted)', opacity: 0.45 }} />
              <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]}>
                {snapshot.severity.map((point) => (
                  <Cell key={point.severity} fill={severityColor[point.severity] ?? 'var(--primary)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </section>
    </div>
  );
}
