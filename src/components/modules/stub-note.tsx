import type { ReactNode } from 'react';

export function StubNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground ring-1 ring-foreground/10">
      {children}
    </p>
  );
}
