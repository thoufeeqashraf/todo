import {
  Building2,
  HardHat,
  Hotel,
  Stethoscope,
  Store,
  UtensilsCrossed,
  Warehouse,
  Wrench,
} from 'lucide-react';

import { Reveal } from '@/components/marketing/reveal';

const industries = [
  { icon: UtensilsCrossed, name: 'Restaurants', body: 'Opening, line checks, recovery, and cash-up.' },
  { icon: Store, name: 'Retail', body: 'Floor standards, recovery, and close across stores.' },
  { icon: Building2, name: 'Property', body: 'Facilities, security, and the ticket that needs proof.' },
  { icon: HardHat, name: 'Construction', body: 'Site tasks, inspections, and who is responsible today.' },
  { icon: Hotel, name: 'Hotels', body: 'Housekeeping, guest issues, and the shift handover.' },
  { icon: Warehouse, name: 'Warehouses', body: 'Dispatch, checks, and work that cannot sit unowned.' },
  { icon: Wrench, name: 'Field service', body: 'Jobs with a due time, a person, and a photo when it is done.' },
  { icon: Stethoscope, name: 'Clinics', body: 'Admin checklists and handoffs, without mixing tenants.' },
];

export function Industries() {
  return (
    <section id="industries" className="scroll-mt-24 border-y bg-muted/25 py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Industries</p>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl leading-tight sm:text-4xl">
            Restaurant, retail, property, construction, and the floors beside them.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            The shared loop does not change: assign, set a due time, run the checklist, collect proof, and let a manager see it.
            The industry changes the labels and the defaults.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry, index) => (
            <Reveal key={industry.name} delay={index * 0.04}>
              <article className="h-full rounded-2xl border bg-background p-5">
                <industry.icon className="size-5 text-primary" />
                <h3 className="mt-4 text-sm font-medium">{industry.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{industry.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
