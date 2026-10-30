import {
  Camera,
  LayoutDashboard,
  ListTodo,
  ShieldCheck,
  Users,
  Waypoints,
} from 'lucide-react';

import { Reveal } from '@/components/marketing/reveal';

const features = [
  {
    icon: ListTodo,
    title: 'Work moves downward',
    body: 'Seniors assign tasks with a due time. The person who owns the work sees it on their list.',
  },
  {
    icon: Camera,
    title: 'Proof comes back up',
    body: 'Comments, photos, and video sit on the task so a manager can see what is blocked.',
  },
  {
    icon: Users,
    title: 'Hierarchy, not a flat board',
    body: 'About ten staff levels. Higher levels see the people below them. Lower levels see their own work.',
  },
  {
    icon: Waypoints,
    title: 'Industry, then modules',
    body: 'The sector chosen at signup sets labels and defaults. Optional modules stay off until the company turns them on.',
  },
  {
    icon: LayoutDashboard,
    title: 'Three ways to look',
    body: 'Doers finish work. Assigners hand it out. Overseers watch the site, the department, and the day.',
  },
  {
    icon: ShieldCheck,
    title: 'Rules live on the server',
    body: 'The web console and a future mobile app read the same bootstrap. The browser does not invent a second set of rules.',
  },
];

export function FeatureGrid() {
  return (
    <section id="product" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal>
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Product</p>
        <h2 className="mt-3 max-w-xl text-balance text-3xl leading-tight sm:text-4xl">
          A calm console for the shift that is already happening.
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 0.05}>
            <article className="h-full rounded-2xl border bg-card/80 p-6 shadow-sm transition-shadow hover:shadow-md">
              <feature.icon className="size-5 text-primary" />
              <h3 className="mt-4 text-base font-medium tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
