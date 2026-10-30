'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

import { Logo } from '@/components/marketing/logo';
import { Mesh } from '@/components/marketing/mesh';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from 'cn';

export function AuthShell({
  kicker,
  title,
  body,
  points,
  wide = false,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  points: string[];
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn('grid min-h-svh bg-background', wide ? 'lg:grid-cols-[minmax(280px,0.78fr)_1.22fr]' : 'lg:grid-cols-2')}>
      <aside className="relative overflow-hidden bg-[oklch(0.17_0.045_268)] text-white lg:sticky lg:top-0 lg:h-svh">
        <Mesh variant="brand" />
        <div className="relative flex h-full flex-col justify-between gap-8 px-6 py-6 sm:px-10 lg:px-12 lg:py-12">
          <Logo tone="inverse" />
          <div className="max-w-md">
            <p className="text-xs font-medium tracking-[0.16em] text-white/55 uppercase">{kicker}</p>
            <p className="mt-3 text-[clamp(1.7rem,3vw,2.6rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-white">
              {title}
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{body}</p>
            <ul className="mt-8 hidden space-y-3 lg:block">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-white/85">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Check className="size-3" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <p className="hidden text-xs text-white/45 lg:block">ToDo App · South Africa, Europe, or multi-region</p>
        </div>
      </aside>
      <div className="flex min-h-svh flex-col">
        <div className="flex items-center justify-end px-6 py-4">
          <ThemeToggle />
        </div>
        <div className={cn('mx-auto flex w-full flex-1 flex-col justify-center px-6 pb-16', wide ? 'max-w-3xl' : 'max-w-md')}>
          {children}
        </div>
      </div>
    </div>
  );
}
