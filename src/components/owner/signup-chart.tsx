'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/features/chart';

const config = {
  signups: { label: 'Signups', color: 'var(--primary)' },
} satisfies ChartConfig;

export function SignupChart({ rows }: { rows: { date: string; signups: number }[] }) {
  const data = rows.map((row) => ({
    ...row,
    label: row.date.slice(5),
  }));
  const total = data.reduce((sum, row) => sum + row.signups, 0);
  if (total === 0) {
    return <p className="px-1 py-10 text-center text-sm text-muted-foreground">No businesses were created in the last 30 days.</p>;
  }
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="signups" fill="var(--color-signups)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
