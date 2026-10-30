import Link from 'next/link';

import { PageHeader } from '@/components/admin/page-header';
import { ConfigNotice } from '@/components/config-notice';
import { EmptyState } from '@/components/empty-state';
import { countOrDash, formatWhen } from '@/components/owner/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requirePageOwner } from '@/lib/owner/page-owner';
import { executeOwner, listIndustryTemplates } from '@/lib/owner/service';
import { supabaseOwnerStore } from '@/lib/owner/supabase-store';

export const instant = false;

type TenantItem = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  region: string;
  status: string;
  plan: { code?: string; status?: string } | null;
  userCount: number | null;
  modules: { name: string; displayName: string }[];
  createdAt: string;
};

function one(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const owner = await requirePageOwner();
  if (!owner.configured) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set the Supabase URL and service role, then apply migrations 001–003."
      />
    );
  }
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['q', 'status', 'industryId', 'plan', 'offset'] as const) {
    const value = one(raw[key]);
    if (value) query.set(key, value);
  }
  const [result, industries] = await Promise.all([
    executeOwner({
      auth: { ok: true, owner },
      method: 'GET',
      parts: ['tenants'],
      searchParams: query,
      body: undefined,
      store: supabaseOwnerStore,
    }),
    listIndustryTemplates(supabaseOwnerStore),
  ]);

  const body = result.body as {
    items?: TenantItem[];
    page?: { limit: number; offset: number; total: number; hasMore: boolean };
    billingAvailable?: boolean;
    capped?: boolean;
    error?: { message?: string };
  };

  const items = body.items ?? [];
  const page = body.page;
  const status = one(raw.status) || 'all';
  const plan = one(raw.plan) || 'all';
  const industryId = one(raw.industryId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Owner"
        title="Businesses"
        description="Every company on the platform. Search matches the name or slug."
        action={<Button render={<Link href="/owner/tenants/new" />}>New business</Button>}
      />
      <form action="/owner/tenants" className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Search
          <Input name="q" defaultValue={one(raw.q)} placeholder="Name or slug" className="w-52" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Status
          <select name="status" defaultValue={status} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Industry
          <select name="industryId" defaultValue={industryId} className="h-8 max-w-52 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="">All</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Plan
          <select name="plan" defaultValue={plan} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="all">All</option>
            <option value="none">No plan</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="scale">Scale</option>
          </select>
        </label>
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
      </form>
      {result.status !== 200 ? (
        <EmptyState title="Could not list businesses" body={body.error?.message || 'Try the filters again.'} />
      ) : items.length === 0 ? (
        <EmptyState title="No matching businesses" body="Change the filters, or create a company and invite its admin." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>People</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link href={`/owner/tenants/${item.id}`} className="font-medium hover:underline">
                      {item.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.slug}</p>
                  </TableCell>
                  <TableCell>{item.industry || '—'}</TableCell>
                  <TableCell className="capitalize">
                    {item.plan?.code ? `${item.plan.code}${item.plan.status ? ` · ${item.plan.status}` : ''}` : body.billingAvailable === false ? '—' : 'None'}
                  </TableCell>
                  <TableCell className="font-numeric">{countOrDash(item.userCount)}</TableCell>
                  <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                    {item.modules.length ? item.modules.map((module) => module.displayName).join(', ') : 'None'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'suspended' ? 'destructive' : 'secondary'} className="capitalize">
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-numeric text-xs">{formatWhen(item.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {page ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {page.total} businesses{body.capped ? ' (list capped at 1,000)' : ''}
            {body.billingAvailable === false && plan !== 'all' ? ' Plan filter needs migration 005.' : ''}
          </p>
          <div className="flex gap-2">
            {page.offset > 0 ? (
              <Button variant="outline" size="sm" render={<Link href={pageHref(query, Math.max(0, page.offset - page.limit))} />}>
                Previous
              </Button>
            ) : null}
            {page.hasMore ? (
              <Button variant="outline" size="sm" render={<Link href={pageHref(query, page.offset + page.limit)} />}>
                Next
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pageHref(query: URLSearchParams, offset: number) {
  const next = new URLSearchParams(query);
  if (offset > 0) next.set('offset', String(offset));
  else next.delete('offset');
  const text = next.toString();
  return text ? `/owner/tenants?${text}` : '/owner/tenants';
}
