import Link from 'next/link';

import { Logo } from '@/components/marketing/logo';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '#product', label: 'Features' },
      { href: '#industries', label: 'Industries' },
      { href: '#how', label: 'How it works' },
      { href: '#pricing', label: 'Plans' },
      { href: '#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Entrances',
    links: [
      { href: '/signup', label: 'Create a company' },
      { href: '/customer-login', label: 'Customer sign in' },
      { href: '/login', label: 'Operator sign in' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            ToDo App is the web console for company tasks, proof of work, and hierarchy.
            One tenant per company.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-medium">{column.title}</p>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto w-full max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          ToDo App · Customer and operator entrances stay separate.
        </p>
      </div>
    </footer>
  );
}
