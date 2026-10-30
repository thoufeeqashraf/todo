'use client';

import Link from 'next/link';
import { useId } from 'react';

import { cn } from 'cn';

export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  const gradient = `todo-mark-${id.replace(/:/g, '')}`;

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-8 shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradient} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.62 0.17 264)" />
          <stop offset="1" stopColor="oklch(0.42 0.19 278)" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="7" width="21" height="21" rx="6" className="fill-primary/25" />
      <rect x="8" y="2.5" width="22" height="22" rx="6.5" fill={`url(#${gradient})`} />
      <path
        d="M14.2 13.4 17.4 16.7 24.1 9.8"
        fill="none"
        stroke="white"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  tone = 'default',
  className,
}: {
  tone?: 'default' | 'inverse';
  className?: string;
}) {
  const inverse = tone === 'inverse';

  return (
    <Link
      href="/"
      className={cn('inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50', className)}
    >
      <LogoMark />
      <span className={cn('text-sm tracking-tight', inverse ? 'text-white' : 'text-foreground')}>
        <span className="font-semibold">ToDo</span>
        <span className={cn('ml-1 font-medium', inverse ? 'text-white/70' : 'text-muted-foreground')}>App</span>
      </span>
    </Link>
  );
}
