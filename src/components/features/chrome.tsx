'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from 'cn';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { initials } from '@/components/features/records';

const tones: Record<string, string> = {
  active: 'border-transparent bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  completed: 'border-transparent bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  complete: 'border-transparent bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  good: 'border-transparent bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  credit: 'border-transparent bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  paid: 'border-transparent bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  scheduled: 'border-transparent bg-primary/12 text-primary',
  in_progress: 'border-transparent bg-primary/12 text-primary',
  admin: 'border-transparent bg-primary/12 text-primary',
  open: 'border-transparent bg-amber-500/15 text-amber-950 dark:text-amber-100',
  pending: 'border-transparent bg-amber-500/15 text-amber-950 dark:text-amber-100',
  watch: 'border-transparent bg-amber-500/15 text-amber-950 dark:text-amber-100',
  travel: 'border-transparent bg-amber-500/15 text-amber-950 dark:text-amber-100',
  partial: 'border-transparent bg-amber-500/15 text-amber-950 dark:text-amber-100',
  high: 'border-transparent bg-orange-500/15 text-orange-950 dark:text-orange-100',
  urgent: 'border-transparent bg-destructive/10 text-destructive',
  poor: 'border-transparent bg-destructive/10 text-destructive',
  unpaid: 'border-transparent bg-destructive/10 text-destructive',
  debit: 'border-transparent bg-destructive/10 text-destructive',
  inactive: 'border-transparent bg-muted text-muted-foreground',
  low: 'border-transparent bg-muted text-muted-foreground',
  user: 'border-transparent bg-muted text-muted-foreground',
  read: 'border-transparent bg-muted text-muted-foreground',
  closed: 'border-transparent bg-muted text-muted-foreground',
  off: 'border-transparent bg-muted text-muted-foreground',
  regular: 'border-transparent bg-secondary text-secondary-foreground',
  medium: 'border-transparent bg-secondary text-secondary-foreground',
  manager: 'border-transparent bg-secondary text-secondary-foreground',
  stub: 'border-transparent bg-muted text-muted-foreground',
};

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {kicker ? (
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">{kicker}</p>
        ) : null}
        <h1 className="text-2xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-numeric mt-1 text-2xl tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Callout({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-foreground/10">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

export function DataTableFrame({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">{children}</div>;
}

export function DataToolbar({
  query,
  onQuery,
  placeholder,
  children,
}: {
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-8"
        />
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const key = value.toLowerCase().replaceAll(' ', '_');
  return (
    <Badge variant="outline" className={cn('capitalize', tones[key])}>
      {value.replaceAll('_', ' ')}
    </Badge>
  );
}

export function PersonCell({ name, detail }: { name: string; detail?: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar size="sm">
        <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-[4.5rem] rounded-xl" />
        <Skeleton className="h-[4.5rem] rounded-xl" />
        <Skeleton className="h-[4.5rem] rounded-xl" />
      </div>
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 border-b px-3 py-3 last:border-0">
            <Skeleton className="size-6 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="ml-auto h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Field({
  name,
  label,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
