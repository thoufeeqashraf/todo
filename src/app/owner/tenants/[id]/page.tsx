import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/admin/page-header';
import { ConfigNotice } from '@/components/config-notice';
import { EmptyState } from '@/components/empty-state';
import { countOrDash, formatRupees, formatWhen } from '@/components/owner/format';
import { TenantActions } from '@/components/owner/tenant-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requirePageOwner } from '@/lib/owner/page-owner';
import { getTenant, listIndustryTemplates } from '@/lib/owner/service';
import { supabaseOwnerStore } from '@/lib/owner/supabase-store';
import { isUuid } from '@/lib/request-guards';

export const instant = false;

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const owner = await requirePageOwner();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  if (!owner.configured) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set the Supabase URL and service role, then apply migrations 001–003."
      />
    );
  }

  const [tenant, industries] = await Promise.all([getTenant(supabaseOwnerStore, id), listIndustryTemplates(supabaseOwnerStore)]);
  if (!tenant) notFound();
  const { company } = tenant;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Business"
        title={company.name}
        description={`${company.slug} · ${company.region.toUpperCase()}`}
        action={
          <Badge variant={company.status === 'suspended' ? 'destructive' : 'secondary'} className="capitalize">
            {company.status}
          </Badge>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Industry', value: company.industry || '—' },
          { label: 'People', value: countOrDash(tenant.usage.users) },
          { label: 'Tasks', value: countOrDash(tenant.usage.tasks) },
          { label: 'Created', value: formatWhen(company.createdAt) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/10">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-lg font-medium tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>
      <Card className="bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Read-only snapshot. Edits are in the profile card below and are written to the audit log.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Slug: <span className="font-medium">{company.slug}</span></p>
          <p>Region: <span className="font-medium">{company.region}</span></p>
          <p>Status: <span className="font-medium capitalize">{company.settings.status}</span></p>
          <p>Suspended: <span className="font-numeric">{formatWhen(company.settings.suspendedAt)}</span></p>
          <p>Departments: <span className="font-numeric">{countOrDash(tenant.usage.departments)}</span></p>
          <p>Invitations: <span className="font-numeric">{countOrDash(tenant.usage.invitations)}</span></p>
          <p>Audit events: <span className="font-numeric">{countOrDash(tenant.usage.auditEvents)}</span></p>
          <p>Modules on: <span className="font-numeric">{tenant.usage.enabledModules}</span></p>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            <Link href="/owner/tenants" className="underline-offset-4 hover:underline">All businesses</Link>
          </p>
        </CardContent>
      </Card>
      <TenantActions
        companyId={company.id}
        name={company.name}
        industryId={company.industryId}
        region={company.region}
        status={company.status}
        modules={tenant.modules}
        industries={industries.map((industry) => ({ id: industry.id, displayName: industry.displayName }))}
      />
      <Card className="bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>People</CardTitle>
          <CardDescription>Roles in this business. Passwords are not shown.</CardDescription>
        </CardHeader>
        <CardContent>
          {tenant.users.length === 0 ? (
            <EmptyState title="No people yet" body="The admin joins when they open the invite link and choose a password." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>{user.isActive ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell className="font-numeric text-xs">{formatWhen(user.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            {tenant.billing.available
              ? 'Latest subscription and invoices. This does not charge a card.'
              : 'Migration 005 is not applied, so plan and invoice rows are unavailable.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {tenant.billing.available ? (
            tenant.billing.subscription ? (
              <p>
                Plan <span className="font-medium capitalize">{tenant.billing.subscription.planCode}</span>
                {' · '}
                <span className="capitalize">{tenant.billing.subscription.status}</span>
                {tenant.billing.subscription.currentPeriodEnd
                  ? ` · renews ${formatWhen(tenant.billing.subscription.currentPeriodEnd)}`
                  : ''}
              </p>
            ) : (
              <p className="text-muted-foreground">No subscription row for this business.</p>
            )
          ) : null}
          {tenant.billing.invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.billing.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="capitalize">{invoice.status}</TableCell>
                    <TableCell className="font-numeric">{formatRupees(invoice.amountDuePaise)}</TableCell>
                    <TableCell className="font-numeric">{formatRupees(invoice.amountPaidPaise)}</TableCell>
                    <TableCell className="font-numeric text-xs">{formatWhen(invoice.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
      <Card className="bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Audit</CardTitle>
          <CardDescription>Latest events for this business, including owner actions.</CardDescription>
        </CardHeader>
        <CardContent>
          {tenant.audit.length === 0 ? (
            <EmptyState title="No audit rows" body="Invites, module changes, and suspension are written here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.audit.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-numeric text-xs">{formatWhen(entry.createdAt)}</TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.entityType || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
