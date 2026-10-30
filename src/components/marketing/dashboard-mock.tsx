'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { Badge } from '@/components/ui/badge';

const days = [
  { label: 'Mon', value: 62 },
  { label: 'Tue', value: 78 },
  { label: 'Wed', value: 54 },
  { label: 'Thu', value: 86 },
  { label: 'Fri', value: 92 },
  { label: 'Sat', value: 71 },
  { label: 'Sun', value: 48 },
];

const tasks = [
  { initials: 'AK', name: 'Amina K.', task: 'Opening checklist', meta: 'Kitchen · Due 10:00', state: 'Proof due', tone: 'bg-[oklch(0.9_0.04_264)] text-[oklch(0.32_0.08_264)]' },
  { initials: 'LM', name: 'Leo M.', task: 'Cold-line temperature', meta: 'Prep · Due 10:30', state: 'In progress', tone: 'bg-[oklch(0.9_0.05_200)] text-[oklch(0.3_0.06_200)]' },
  { initials: 'PS', name: 'Priya S.', task: 'Floor recovery', meta: 'Front of house · Live', state: 'Watching', tone: 'bg-[oklch(0.91_0.05_150)] text-[oklch(0.32_0.06_150)]' },
  { initials: 'ND', name: 'Noah D.', task: 'Cash-up', meta: 'Close · Unassigned', state: 'Open', tone: 'bg-[oklch(0.92_0.03_80)] text-[oklch(0.35_0.05_70)]' },
];

const sites = [
  { name: 'Harbour', value: 92 },
  { name: 'Northline', value: 71 },
  { name: 'Atlas', value: 48 },
  { name: 'Siteform', value: 84 },
];

export function DashboardMock() {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-primary/10 blur-3xl dark:bg-primary/20" />
      <motion.div
        className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl shadow-primary/10 ring-1 ring-foreground/10"
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[oklch(0.7_0.16_25)]" />
            <span className="size-2.5 rounded-full bg-[oklch(0.82_0.14_90)]" />
            <span className="size-2.5 rounded-full bg-[oklch(0.75_0.14_155)]" />
          </div>
          <p className="font-numeric text-[11px] text-muted-foreground">Preview · Harbour Kitchen</p>
          <Badge variant="secondary">Live floor</Badge>
        </div>

        <div className="grid md:grid-cols-[7.5rem_1fr]">
          <div className="hidden border-r bg-muted/40 p-3 md:block">
            <p className="px-2 pb-2 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">Today</p>
            {['Floor', 'Tasks', 'Staff', 'Proof'].map((item, index) => (
              <div
                key={item}
                className={`rounded-lg px-2 py-1.5 text-xs ${index === 0 ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground">On time today</p>
                <div className="mt-2 flex items-center gap-3">
                  <svg viewBox="0 0 36 36" className="size-12 -rotate-90" aria-hidden>
                    <circle cx="18" cy="18" r="14" fill="none" className="stroke-border" strokeWidth="3.5" />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-primary"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="75.6 88"
                    />
                  </svg>
                  <div>
                    <p className="font-numeric text-xl leading-none">86%</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">14 due</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground">Completion this week</p>
                <div className="mt-3 flex h-14 items-end gap-1.5" aria-hidden>
                  {days.map((day) => (
                    <div
                      key={day.label}
                      className="min-w-0 flex-1 rounded-sm bg-primary"
                      style={{ height: `${Math.max(22, Math.round(day.value * 0.52))}px` }}
                      title={`${day.label} ${day.value}%`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between font-numeric text-[9px] text-muted-foreground">
                  <span>Mon</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium">Assigned work</p>
                <p className="font-numeric text-[11px] text-muted-foreground">4 open</p>
              </div>
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.task} className="flex items-center gap-3 rounded-xl border bg-background/80 px-2.5 py-2">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${task.tone}`}>
                      {task.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{task.task}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{task.name} · {task.meta}</span>
                    </span>
                    <span className="font-numeric text-[10px] text-muted-foreground">{task.state}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {sites.map((site) => (
                <div key={site.name}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${site.value}%` }} />
                  </div>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">{site.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
