import Link from 'next/link';
import { Check } from 'lucide-react';

import { Reveal } from '@/components/marketing/reveal';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Site',
    audience: 'One location',
    points: [
      'Company tenant and first admin',
      'Industry pack at signup',
      'Tasks, deadlines, and proof',
      'Customer sign-in for that company',
    ],
    href: '/signup',
    cta: 'Create a company',
    featured: false,
  },
  {
    name: 'Multi-site',
    audience: 'A brand with many floors',
    points: [
      'Hierarchy across people and sites',
      'Modules you turn on, and only those',
      'Doer, assigner, and overseer views',
      'Region: South Africa, EU, or multi',
    ],
    href: '/signup',
    cta: 'Create a company',
    featured: true,
  },
  {
    name: 'Network',
    audience: 'Platform operators',
    points: [
      'Separate operator entrance',
      'Control of the customer mobile app',
      'Web stays the source of truth',
      'Development gate, off in production',
    ],
    href: '/login',
    cta: 'Operator sign in',
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 border-y bg-muted/25 py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Plans</p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl leading-tight sm:text-4xl">
            Monthly or yearly. Scope follows the modules you turn on.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            There is no public rate card yet. A company starts by creating a tenant.
            Operators use a different entrance, and that gate is closed on the live site.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 0.06}>
              <article
                className={`flex h-full flex-col rounded-2xl border bg-background p-6 ${plan.featured ? 'ring-2 ring-primary' : ''}`}
              >
                <p className="text-sm font-medium">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.audience}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className="mt-8">
                  <Button className="w-full" variant={plan.featured ? 'default' : 'outline'}>
                    {plan.cta}
                  </Button>
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
