import Link from 'next/link';

import { PageHeader } from '@/components/admin/page-header';
import { ConfigNotice } from '@/components/config-notice';
import { EmptyState } from '@/components/empty-state';
import { countOrDash, formatWhen } from '@/components/owner/format';
import { SignupChart } from '@/components/owner/signup-chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requirePageOwner } from '@/lib/owner/page-owner';
import { buildOverview } from '@/lib/owner/service';
import { supabaseOwnerStore } from '@/lib/owner/supabase-store';

export const instant = false;

export default async function OwnerHomePage() {
  const owner = await requirePageOwner();
  if (!owner.configured) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003. Billing charts stay empty until migration 005 is applied."
      />
    );
  }

  const overview = await buildOverview(supabaseOwnerStore);
  const metrics = [
    { label: 'Businesses', value: countOrDash(overview.totals.tenants), hint: `${overview.totals.activeTenants} active` },
    { label: 'Suspended', value: countOrDash(overview.totals.suspendedTenants), hint: 'Stored on company settings' },
    { label: 'People', value: countOrDash(overview.totals.users), hint: 'Across every business' },
    { label: 'Tasks', value: countOrDash(overview.totals.tasks), hint: 'All companies' },
    { label: 'Signups, 7 days', value: countOrDash(overview.totals.signups7d), hint: 'New companies' },
    { label: 'Signups, 30 days', value: countOrDash(overview.totals.signups30d), hint: 'New companies' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Owner"
        title="Every business"
        description="Totals for the product, not one company. Plans appear when the billing tables from migration 005 are present."
        action={
          <Button render={<Link href="/owner/tenants/new" />}>New business</Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/10">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="font-numeric mt-1 text-2xl tracking-tight">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="bg-card/80 shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle>New businesses</CardTitle>
            <CardDescription>Companies created on each UTC day for the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignupChart rows={overview.signupsByDay} />
          </CardContent>
        </Card>
        <Card className="bg-card/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Plans</CardTitle>
            <CardDescription>
              {overview.billing.available ? 'Subscriptions on file.' : 'Migration 005 is not applied. Plan totals are hidden.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.billing.available && overview.billing.byPlan.length === 0 ? (
              <EmptyState title="No subscriptions" body="Companies can still use the product. A plan appears after Stripe checkout writes a row." />
            ) : null}
            {overview.billing.byPlan.map((row) => (
              <div key={row.plan} className="flex items-center justify-between text-sm">
                <span className="capitalize">{row.plan}</span>
                <span className="font-numeric">{row.count}</span>
              </div>
            ))}
            {overview.billing.byStatus.map((row) => (
              <div key={row.status} className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="capitalize">{row.status}</span>
                <span className="font-numeric">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Recent signups</CardTitle>
          <CardDescription>Newest companies first.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.recentSignups.length === 0 ? (
            <EmptyState title="No businesses yet" body="Create the first company from this console, or wait for a customer to sign up." />
          ) : (
            <ul className="divide-y">
              {overview.recentSignups.map((company) => (
                <li key={company.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <Link href={`/owner/tenants/${company.id}`} className="font-medium hover:underline">
                      {company.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{company.industry || company.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={company.status === 'suspended' ? 'destructive' : 'secondary'} className="capitalize">
                      {company.status}
                    </Badge>
                    <span className="font-numeric text-xs text-muted-foreground">{formatWhen(company.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Owner actions</CardTitle>
          <CardDescription>Audit rows whose action starts with owner.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.recentOwnerActions.length === 0 ? (
            <EmptyState title="No owner actions yet" body="Creating a business, changing modules, or suspending a tenant writes a row here." />
          ) : (
            <ul className="divide-y">
              {overview.recentOwnerActions.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <Link href={`/owner/tenants/${entry.companyId}`} className="font-medium hover:underline">
                    {entry.action}
                  </Link>
                  <span className="font-numeric text-xs text-muted-foreground">{formatWhen(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
