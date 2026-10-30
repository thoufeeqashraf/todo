import Link from 'next/link';

import { Logo } from '@/components/marketing/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const links = [
  { href: '#product', label: 'Product' },
  { href: '#industries', label: 'Industries' },
  { href: '#how', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export function SiteHeader() {
  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Logo />
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex" aria-label="Page">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/customer-login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Start a company</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
