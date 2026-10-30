import Link from 'next/link';
import type { ReactNode } from 'react';

import { helpNavItems } from '@/components/help/nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export function HelpShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-canvas min-h-svh">
      <a
        href="#help-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:ring-1 focus:ring-foreground/15"
      >
        Skip to content
      </a>
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                W
              </span>
              <span className="text-sm font-semibold tracking-tight">Workplace</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Help">
              {helpNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/customer-login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Start a company</Button>
            </Link>
          </div>
        </div>
        <nav className="border-t sm:hidden" aria-label="Help">
          <div className="mx-auto flex w-full max-w-6xl gap-1 px-4 py-2">
            {helpNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main id="help-main" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}
