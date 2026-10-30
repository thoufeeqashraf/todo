import { Reveal } from '@/components/marketing/reveal';

const steps = [
  {
    n: '01',
    title: 'Create the company',
    body: 'Name it, choose the industry, and pick South Africa, Europe, or multi-region. Signup adds the first admin.',
  },
  {
    n: '02',
    title: 'Invite the hierarchy',
    body: 'People join one company from an invitation link. A higher level can see the work below. A lower level sees their own.',
  },
  {
    n: '03',
    title: 'Assign the shift',
    body: 'Hand work downward with a deadline. Doers complete it. Assigners keep the list moving.',
  },
  {
    n: '04',
    title: 'Read the proof',
    body: 'Notes, photos, and video come back on the task. Overseers watch the floor from the console.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal>
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">How it works</p>
        <h2 className="mt-3 max-w-xl text-balance text-3xl leading-tight sm:text-4xl">
          From a new company to a shift someone can defend.
        </h2>
      </Reveal>
      <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <Reveal key={step.n} delay={index * 0.06}>
            <li className="h-full rounded-2xl border bg-card p-6">
              <p className="font-numeric text-sm text-primary">{step.n}</p>
              <h3 className="mt-4 text-base font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
