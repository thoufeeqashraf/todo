import Link from 'next/link';
import { Check } from 'lucide-react';

import { helpCenterPath } from '@/components/help/nav';
import type { OnboardingCounts, OnboardingStep } from '@/components/help/onboarding-steps';
import { onboardingProgress } from '@/components/help/onboarding-steps';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const barWidths = ['w-0', 'w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-full'] as const;

export function OnboardingChecklist({
  counts,
  steps,
}: {
  counts: OnboardingCounts;
  steps: OnboardingStep[];
}) {
  const progress = onboardingProgress(steps);
  const width = barWidths[progress.done] ?? 'w-0';
  const webReady = steps.filter((step) => !step.deferred).every((step) => step.done);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Setup</p>
          <h1>Get this company ready</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Four checks read teams, invitations, people, enabled modules, and active geofences. Mobile stays open
            until a phone app exists.
          </p>
        </div>
        <Badge variant="secondary">
          <span className="font-numeric">
            {progress.done}/{progress.total}
          </span>{' '}
          complete
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Setup progress">
          <div className={`h-full rounded-full bg-primary transition-[width] ${width}`} />
        </div>
        <p className="text-sm text-muted-foreground">
          {webReady
            ? 'The web setup is complete. Connect mobile later.'
            : 'Finish the open web steps, then leave mobile for a later release.'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Teams" value={counts.teams} />
        <Stat label="People" value={counts.users} hint={counts.invitations === 1 ? '1 invitation' : `${counts.invitations} invitations`} />
        <Stat label="Modules on" value={counts.enabledModules} />
        <Stat label="Active fences" value={counts.activeGeofences} />
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.id}>
            <div className="flex gap-4 rounded-xl bg-card/80 p-4 shadow-sm ring-1 ring-foreground/10 sm:p-5">
              <span
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
                aria-hidden
              >
                {step.done ? <Check className="size-4" /> : <span className="font-numeric">{index + 1}</span>}
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base">{step.title}</h2>
                      <Badge variant={step.done ? 'default' : 'outline'}>
                        {step.done ? 'Done' : step.deferred ? 'Later' : 'To do'}
                      </Badge>
                    </div>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{step.summary}</p>
                  </div>
                  <Link href={step.href}>
                    <Button variant="outline" size="sm">
                      {step.hrefLabel}
                    </Button>
                  </Link>
                </div>
                <p className="font-numeric text-xs text-muted-foreground">{step.evidence}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-sm text-muted-foreground">
        Article detail lives in the{' '}
        <Link href={helpCenterPath} className="text-primary hover:underline">
          help center
        </Link>
        . This page only reports what is already stored.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="bg-card/80 shadow-sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-numeric text-3xl">{value}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}
