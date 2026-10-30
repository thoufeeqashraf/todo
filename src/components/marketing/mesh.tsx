'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { cn } from 'cn';

export function Mesh({
  variant = 'canvas',
  className,
}: {
  variant?: 'canvas' | 'brand';
  className?: string;
}) {
  const reduce = useReducedMotion();
  const brand = variant === 'brand';

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div
        className={cn(
          'absolute inset-0 bg-size-[72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_18%,transparent_72%)]',
          brand
            ? 'bg-[linear-gradient(to_right,oklch(1_0_0/0.08)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.08)_1px,transparent_1px)]'
            : 'bg-[linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_8%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_8%,transparent)_1px,transparent_1px)]',
        )}
      />
      <motion.div
        className={cn(
          'absolute -left-24 -top-20 size-[28rem] rounded-full blur-3xl',
          brand ? 'bg-[oklch(0.55_0.2_268)]/45' : 'bg-primary/25 dark:bg-primary/35',
        )}
        animate={reduce ? undefined : { x: [0, 40, 0], y: [0, 28, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={cn(
          'absolute -right-10 top-1/4 size-[22rem] rounded-full blur-3xl',
          brand ? 'bg-[oklch(0.7_0.14_220)]/35' : 'bg-[oklch(0.72_0.14_220)]/20 dark:bg-[oklch(0.62_0.14_220)]/30',
        )}
        animate={reduce ? undefined : { x: [0, -32, 0], y: [0, 24, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={cn(
          'absolute bottom-[-4rem] left-1/3 size-[18rem] rounded-full blur-3xl',
          brand ? 'bg-[oklch(0.62_0.16_310)]/30' : 'bg-[oklch(0.72_0.14_310)]/15 dark:bg-[oklch(0.58_0.14_310)]/25',
        )}
        animate={reduce ? undefined : { x: [0, 20, 0], y: [0, -18, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
