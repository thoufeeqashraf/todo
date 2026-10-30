import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { DashboardMock } from '@/components/marketing/dashboard-mock';
import { Mesh } from '@/components/marketing/mesh';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const facts = [
  { value: '10', label: 'Staff levels' },
  { value: '1', label: 'Tenant per company' },
  { value: '3', label: 'Data regions' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Mesh />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pt-16 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24 lg:pb-28">
        <div>
          <Badge variant="secondary">Operations console</Badge>
          <h1 className="mt-5 max-w-xl text-balance text-[clamp(2.7rem,6vw,4.8rem)] leading-[0.94] font-semibold tracking-[-0.045em]">
            Know who owns the work before the shift ends.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            ToDo App is the company console for tasks, deadlines, and proof.
            Pick an industry, invite the hierarchy, and keep every company in its own tenant.
            Officials work here. Mobile will follow the same server.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button size="lg" className="h-10 px-4">
                Create a company
                <ArrowRight />
              </Button>
            </Link>
            <Link href="/customer-login">
              <Button size="lg" variant="outline" className="h-10 px-4">
                Customer sign in
              </Button>
            </Link>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t pt-6">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dd className="font-numeric text-2xl leading-none">{fact.value}</dd>
                <dt className="mt-2 text-xs text-muted-foreground">{fact.label}</dt>
              </div>
            ))}
          </dl>
        </div>
        <DashboardMock />
      </div>
    </section>
  );
}
