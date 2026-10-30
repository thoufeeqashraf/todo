import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { BillingUsage } from './load';

const plans = [
  {
    name: 'Starter',
    cadence: 'Monthly',
    summary: 'One company, tasks, and a small team.',
    points: ['Tasks and staff', 'Invite links', 'Admin audit'],
  },
  {
    name: 'Operations',
    cadence: 'Monthly or yearly',
    summary: 'The modules this company turns on, plus usage on this page.',
    points: ['Module toggles', 'Usage counts', 'Invoices when a provider exists'],
  },
  {
    name: 'Platform',
    cadence: 'Yearly',
    summary: 'The full console. Card checkout stays outside this app.',
    points: ['Data region stays za, eu, or multi', 'Admin audit', 'No payment gateway here'],
  },
] as const;

const meters: { key: keyof BillingUsage; label: string; hint: string }[] = [
  { key: 'activePeople', label: 'Active people', hint: 'Users with an active account' },
  { key: 'pendingInvites', label: 'Pending invites', hint: 'Invitations still waiting' },
  { key: 'auditEvents', label: 'Audit events', hint: 'Rows in audit_logs' },
  { key: 'modulesOn', label: 'Modules on', hint: 'Enabled for this company' },
];

function meterValue(value: number | null) {
  return value == null ? '—' : String(value);
}

export function BillingPanel({ usage }: { usage: BillingUsage }) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3">
        <p className="text-sm font-medium">Not connected to a payment provider</p>
        <p className="mt-1 text-sm text-muted-foreground">
          These cards do not charge a card, start a subscription, or issue an invoice. Transaction Junction and every other checkout stay unwired.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2>Plan</h2>
            <p className="text-sm text-muted-foreground">No plan is assigned to this company.</p>
          </div>
          <Badge variant="outline">Not subscribed</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className="bg-card/80 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  <Badge variant="secondary">{plan.cadence}</Badge>
                </div>
                <CardDescription>{plan.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {plan.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">Price is not set. Nothing on this card is billed.</p>
              </CardContent>
              <CardFooter>
                <Button type="button" variant="outline" disabled className="w-full">
                  Not available
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2>Usage</h2>
          <p className="text-sm text-muted-foreground">Counted from this company. This is not a billable meter.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {meters.map((meter) => (
            <Card key={meter.key} className="bg-card/80 shadow-sm">
              <CardHeader>
                <CardDescription>{meter.label}</CardDescription>
                <CardTitle className="font-numeric text-3xl">{meterValue(usage[meter.key])}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{meter.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2>Invoices</h2>
          <p className="text-sm text-muted-foreground">Placeholder only. No invoice has been created, and none can be paid here.</p>
        </div>
        <div className="overflow-x-auto rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm whitespace-normal text-muted-foreground">
                  No invoices. Billing is not connected to a payment provider.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
