import type { ReactNode } from 'react';

export function DataPanel({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">{children}</div>
  );
}
