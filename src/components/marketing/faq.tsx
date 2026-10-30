'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { Reveal } from '@/components/marketing/reveal';

const items = [
  {
    q: 'Is ToDo App a personal task list?',
    a: 'No. It is a multi-tenant console for a company: tasks, staff hierarchy, and the modules that company turns on. A person outside a company staff context is not the audience of this web entrance.',
  },
  {
    q: 'Which sign-in do I use?',
    a: 'Customers sign in at the customer entrance and run their own company. Admin and staff operators use /login, which is a development gate and is closed when the site is in production. Those are different doors.',
  },
  {
    q: 'What does the industry change?',
    a: 'Choosing a sector at registration changes labels, templates, and defaults. Restaurant, retail, property, and construction are the suggested first markets. The signup catalogue includes more. Optional modules stay off until an admin enables them.',
  },
  {
    q: 'Where does a company’s data live?',
    a: 'Each company chooses South Africa, Europe, or multi-region at signup. That choice can be changed later in company settings. One deployment region is not locked for every tenant.',
  },
  {
    q: 'Is the mobile app available?',
    a: 'The web console is the control plane. Mobile is the frontline client those customers will use, and it will call the same server. No mobile app is scaffolded yet.',
  },
  {
    q: 'Do you take payments on this site?',
    a: 'Not in this product slice. Wallet, QR pay, and POS stay later, and they will use a payments API rather than a gateway built here. Creating a company does not charge a card.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-24 px-6 py-24">
      <Reveal>
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">FAQ</p>
        <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">Questions, answered plainly.</h2>
      </Reveal>
      <div className="mt-8 divide-y border-y">
        {items.map((item, index) => {
          const expanded = open === index;
          return (
            <div key={item.q}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 py-5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : index)}
              >
                <span className="text-sm font-medium sm:text-base">{item.q}</span>
                <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="overflow-hidden"
                  >
                    <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
