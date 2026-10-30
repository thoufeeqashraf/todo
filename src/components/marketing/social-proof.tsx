'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { Reveal } from '@/components/marketing/reveal';

const markets = [
  'Restaurants',
  'Retail floors',
  'Property desks',
  'Construction sites',
  'Hotels',
  'Warehouses',
  'Field service',
  'Clinics',
  'Security',
  'Salons and gyms',
];

export function SocialProof() {
  const reduce = useReducedMotion();
  const loop = [...markets, ...markets];

  return (
    <section className="border-y bg-muted/30 py-10" aria-label="Industries">
      <Reveal className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          The same loop, across the catalogue
        </p>
      </Reveal>
      <div className="mt-6 overflow-hidden">
        <motion.div
          className="flex w-max flex-nowrap gap-3 px-6"
          animate={reduce ? undefined : { x: ['0%', '-50%'] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
        >
          {loop.map((market, index) => (
            <span
              key={`${market}-${index}`}
              className="rounded-full border bg-background px-4 py-2 text-sm font-medium tracking-tight text-foreground/80"
            >
              {market}
            </span>
          ))}
        </motion.div>
      </div>
      <p className="mx-auto mt-6 max-w-2xl px-6 text-center text-sm text-muted-foreground">
        Suggested first markets are restaurants, retail, property, and construction.
        Signup still offers the rest of the industry catalogue.
      </p>
    </section>
  );
}
