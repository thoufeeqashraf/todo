'use client';

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

import { EmptyState } from '@/components/empty-state';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/features/chart';
import { Callout, Metric, PageHeader, StatusBadge, TableSkeleton } from '@/components/features/chrome';
import { formatWhen, isRecord, payloadOf, type ModuleLoad } from '@/components/features/records';
import { useModuleData } from '@/components/features/use-module';
import { Button } from '@/components/ui/button';

const labels: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
};

const fills = ['var(--primary)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const config = {
  count: { label: 'Tasks', color: 'var(--primary)' },
} satisfies ChartConfig;

function labelFor(status: string) {
  return labels[status] ?? status.replaceAll('_', ' ');
}

export function ReportsBoard({ initial }: { initial?: ModuleLoad }) {
  const { state, loading, reload } = useModuleData('reports', initial);
  const data = payloadOf(state);
  const counts = isRecord(data?.tasks) ? data.tasks : {};
  const rows = Object.entries(counts).map(([status, count], index) => ({
    status,
    label: labelFor(status),
    count: typeof count === 'number' ? count : Number(count) || 0,
    fill: fills[index % fills.length],
  }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (loading && !state) return <TableSkeleton />;
  if (state && !state.ok) {
    return <EmptyState title="Reports are unavailable" body={state.error} action={<Button onClick={reload}>Try again</Button>} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Analytics"
        title="Reports"
        description={state?.ok ? state.blurb : 'Task counts for this company.'}
        actions={data?.partial === true ? <StatusBadge value="partial" /> : null}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Tasks" value={total} hint="All statuses in this company" />
        <Metric label="Open" value={(rows.find((row) => row.status === 'todo')?.count ?? 0) + (rows.find((row) => row.status === 'in_progress')?.count ?? 0)} hint="To do and in progress" />
        <Metric label="Generated" value={formatWhen(data?.generatedAt)} hint="Server time" />
      </div>
      <Callout title="Partial report" body="This chart counts tasks only. Proof, attendance, and staff health are not included." />
      {total === 0 ? (
        <EmptyState title="No tasks to chart" body="Create a task and this report will count it the next time it loads." action={<Button variant="outline" onClick={reload}>Refresh</Button>} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
            <header className="mb-2">
              <h2 className="text-base">Tasks by status</h2>
              <p className="text-sm text-muted-foreground">Company-wide counts from the task table.</p>
            </header>
            <ChartContainer config={config} className="aspect-auto h-72">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'var(--muted)' }} />
                <Bar dataKey="count" name="Tasks" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {rows.map((row) => <Cell key={row.status} fill={row.fill} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </section>
          <section className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
            <header className="mb-2">
              <h2 className="text-base">Mix</h2>
              <p className="text-sm text-muted-foreground">Share of the same counts.</p>
            </header>
            <ChartContainer config={config} className="aspect-auto h-52">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={rows} dataKey="count" nameKey="label" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="var(--card)">
                  {rows.map((row) => <Cell key={row.status} fill={row.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-2 space-y-2">
              {rows.map((row) => (
                <li key={row.status} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: row.fill }} />
                    {row.label}
                  </span>
                  <span className="font-numeric text-muted-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
