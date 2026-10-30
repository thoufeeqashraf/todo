'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from 'cn';

export type ChartConfig = Record<string, { label?: React.ReactNode; color?: string }>;

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const color = Object.entries(config)
    .filter(([, item]) => item.color)
    .map(([key, item]) => `  --color-${key}: ${item.color};`)
    .join('\n');
  if (!color) return null;
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"] {\n${color}\n}`,
      }}
    />
  );
}

export function ChartContainer({
  id,
  className,
  children,
  config,
}: {
  id?: string;
  className?: string;
  children: React.ReactElement;
  config: ChartConfig;
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;
  return (
    <div
      data-slot="chart"
      data-chart={chartId}
      className={cn(
        'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/70 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-hidden [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden',
        className,
      )}
    >
      <ChartStyle id={chartId} config={config} />
      <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
    </div>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; name?: unknown; color?: string; dataKey?: unknown; payload?: { fill?: string } }>;
  label?: unknown;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="grid min-w-32 gap-1.5 rounded-lg bg-popover px-2.5 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      {label != null && label !== '' ? <p className="text-muted-foreground">{String(label)}</p> : null}
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.name ?? index);
        return (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: item.color || item.payload?.fill || 'var(--primary)' }} />
              {String(item.name ?? key)}
            </span>
            <span className="font-numeric font-medium text-foreground">{String(item.value ?? '')}</span>
          </div>
        );
      })}
    </div>
  );
}
