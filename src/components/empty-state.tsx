import type { ReactNode } from 'react';

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-6 py-14 text-center">
      <p className="text-base font-medium tracking-tight">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
