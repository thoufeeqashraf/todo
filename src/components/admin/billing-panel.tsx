'use client';

import { useRef, useState } from 'react';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  checkoutLabel,
  readApiError,
  statusLabel,
  statusVariant,
  stripeCheckoutUrl,
  type BillingInvoiceView,
  type BillingPlanView,
  type BillingReadState,
  type BillingSubscriptionView,
} from './billing-format';
import type { BillingUsage } from './load';

const meters: { key: keyof BillingUsage; label: string; hint: string }[] = [
  { key: 'activePeople', label: 'Active people', hint: 'Users with an active account' },
  { key: 'pendingInvites', label: 'Pending invites', hint: 'Invitations still waiting' },
  { key: 'auditEvents', label: 'Audit events', hint: 'Rows in audit_logs' },
  { key: 'modulesOn', label: 'Modules on', hint: 'Enabled for this company' },
];

function meterValue(value: number | null) {
  return value == null ? '—' : String(value);
}

function subscriptionCopy(state: BillingReadState) {
  if (state === 'missing') {
    return 'Billing records are not in the database yet. This page stays empty until they are, and nothing here is charged.';
  }
  if (state === 'unavailable') {
    return 'Subscription status could not be loaded. Refresh the page to try again.';
  }
  return 'No plan is assigned to this company.';
}

function invoiceCopy(state: BillingReadState) {
  if (state === 'missing') {
    return 'Invoice rows are not available yet. They will show here after billing is stored for this company.';
  }
  if (state === 'unavailable') {
    return 'Invoices could not be loaded. Refresh the page to try again.';
  }
  return 'Invoices appear here after Stripe bills this company.';
}

export function BillingPanel({
  usage,
  plans,
  subscription,
  subscriptionState,
  invoices,
  invoicesState,
  checkout,
}: {
  usage: BillingUsage;
  plans: BillingPlanView[];
  subscription: BillingSubscriptionView | null;
  subscriptionState: BillingReadState;
  invoices: BillingInvoiceView[];
  invoicesState: BillingReadState;
  checkout: 'success' | 'cancelled' | null;
}) {
  const pendingRef = useRef<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  async function startCheckout(plan: BillingPlanView) {
    if (plan.action === 'current' || pendingRef.current) return;
    pendingRef.current = plan.code;
    setPending(plan.code);
    let redirected = false;
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ plan: plan.code }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const error = readApiError(payload);
      if (response.status === 503 && error === 'Billing not configured') {
        setNotConfigured(true);
        toast.message('Billing is not set up yet', {
          description: 'Stripe is not configured for this environment. No card was charged.',
        });
        return;
      }
      const url = stripeCheckoutUrl(payload && typeof payload === 'object' ? (payload as { url?: unknown }).url : null);
      if (!response.ok || !url) {
        toast.error(error ?? 'Could not start checkout');
        return;
      }
      redirected = true;
      window.location.assign(url);
    } catch {
      toast.error('Could not start checkout');
    } finally {
      if (!redirected) {
        pendingRef.current = null;
        setPending(null);
      }
    }
  }

  return (
    <div className="space-y-8">
      {checkout === 'success' ? (
        <div role="status" className="rounded-xl border bg-primary/5 px-4 py-3 ring-1 ring-primary/15">
          <p className="text-sm font-medium">Checkout completed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Stripe is confirming the payment. The subscription and invoices on this page update after that confirmation.
          </p>
        </div>
      ) : null}
      {checkout === 'cancelled' ? (
        <div role="status" className="rounded-xl border border-dashed bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium">Checkout cancelled</p>
          <p className="mt-1 text-sm text-muted-foreground">No charge was made. You can choose a plan when you are ready.</p>
        </div>
      ) : null}
      {notConfigured ? (
        <div role="status" data-billing-setup="missing" className="rounded-xl border border-dashed bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium">Billing is not set up yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Stripe is not configured for this environment, so checkout did not start. No card was charged. Subscribe and Upgrade stay on this page until billing is set up.
          </p>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2>Subscription</h2>
            <p className="text-sm text-muted-foreground">The plan Stripe has on file for this company. Checkout is limited to company admins.</p>
          </div>
          <Badge variant={subscription ? statusVariant(subscription.status) : 'outline'}>
            {subscription ? statusLabel(subscription.status) : subscriptionState === 'ready' ? 'Not subscribed' : 'No record'}
          </Badge>
        </div>
        {subscription ? (
          <Card className="bg-card/80 shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CreditCard />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardTitle>{subscription.planName}</CardTitle>
                  <CardDescription>
                    {subscription.priceLabel ?? 'Price follows the catalogue when this plan code is recognised.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {subscription.periodLabel ? <Badge variant="secondary">{subscription.periodLabel}</Badge> : null}
              {subscription.cancelAtPeriodEnd ? <Badge variant="outline">Cancels at period end</Badge> : null}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3">
            <p className="text-sm font-medium">No subscription yet</p>
            <p className="mt-1 text-sm text-muted-foreground">{subscriptionCopy(subscriptionState)}</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2>Plans</h2>
          <p className="text-sm text-muted-foreground">Starter, Growth, and Scale, billed monthly in INR. The wallet is not charged here.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {plans.map((plan) => {
            const busy = pending === plan.code;
            const label = busy ? 'Redirecting' : checkoutLabel(plan.action);
            return (
              <Card
                key={plan.code}
                className={`bg-card/80 shadow-sm ${plan.action === 'current' ? 'ring-2 ring-foreground/15' : plan.featured ? 'ring-2 ring-primary' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.action === 'current' ? (
                      <Badge>Current</Badge>
                    ) : plan.featured ? (
                      <Badge variant="secondary">Recommended</Badge>
                    ) : (
                      <Badge variant="outline">Monthly</Badge>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="font-numeric text-3xl tracking-tight">
                    {plan.priceLabel}
                    <span className="ml-1 font-sans text-sm font-normal tracking-normal text-muted-foreground">/ month</span>
                  </p>
                  <ul className="space-y-2">
                    {plan.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    type="button"
                    className="w-full"
                    variant={plan.action === 'current' || !plan.featured ? 'outline' : 'default'}
                    disabled={plan.action === 'current' || pending !== null}
                    aria-busy={busy}
                    onClick={() => void startCheckout(plan)}
                  >
                    {busy ? <Loader2 className="animate-spin" /> : null}
                    {label}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2>Usage</h2>
          <p className="text-sm text-muted-foreground">Counted from this company. These figures are not a Stripe meter and they are not a bill.</p>
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
          <p className="text-sm text-muted-foreground">Rows stored for this company. A hosted invoice opens on Stripe.</p>
        </div>
        {invoices.length === 0 ? (
          <EmptyState title="No invoices yet" body={invoiceCopy(invoicesState)} />
        ) : (
          <div className="overflow-x-auto rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="whitespace-nowrap">{invoice.whenLabel}</TableCell>
                    <TableCell className="font-mono text-xs">{invoice.number}</TableCell>
                    <TableCell className="font-numeric whitespace-nowrap">{invoice.amountLabel}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
