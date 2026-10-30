'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { runModule } from '@/app/customer/actions';
import { EmptyState } from '@/components/empty-state';
import { Callout, DataToolbar, Field, Metric, PageHeader, PersonCell, StatusBadge, TableSkeleton } from '@/components/features/chrome';
import { RecordTable, statusColumn, type Column } from '@/components/features/record-table';
import { copyText } from '@/components/features/row-actions';
import {
  asRows,
  displayName,
  formatWhen,
  messageOf,
  money,
  payloadOf,
  shortId,
  text,
  type ModuleLoad,
} from '@/components/features/records';
import { useModuleData } from '@/components/features/use-module';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const copy: Record<string, { kicker: string; title: string; action?: string }> = {
  incidents: { kicker: 'Operations', title: 'Incidents', action: 'Report incident' },
  attendance: { kicker: 'Operations', title: 'Attendance', action: 'Attendance action' },
  health: { kicker: 'People', title: 'Staff health', action: 'Record event' },
  wallet: { kicker: 'Finance', title: 'Wallet', action: 'Ledger entry' },
  pos: { kicker: 'Commerce', title: 'POS orders', action: 'Open order' },
  cctv: { kicker: 'Sites', title: 'Cameras', action: 'Register camera' },
  'mini-apps': { kicker: 'Platform', title: 'Mini-apps' },
  find: { kicker: 'People', title: 'Find My Staff', action: 'Record location' },
  notifications: { kicker: 'Inbox', title: 'Notifications' },
  audit: { kicker: 'Admin', title: 'Audit log' },
  onboarding: { kicker: 'Setup', title: 'Onboarding' },
};

function titleCase(slug: string) {
  return slug.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function matches(row: Record<string, unknown>, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return JSON.stringify(row).toLowerCase().includes(needle);
}

export function ModuleWorkspace({ slug, initial }: { slug: string; initial: ModuleLoad }) {
  const { state, loading, reload } = useModuleData(slug, initial);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const meta = copy[slug] ?? { kicker: 'Company', title: titleCase(slug) };
  const data = payloadOf(state);
  const writable = Boolean(meta.action);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
    setPending(true);
    const result = await runModule(slug, body);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const note = messageOf(result.data);
    toast.success(note || 'Saved');
    setOpen(false);
    reload();
  }

  async function markRead(id: string) {
    const result = await runModule('notifications', { id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Marked read');
    reload();
  }

  async function topUp() {
    setPending(true);
    const result = await runModule('wallet', { intent: 'topup' });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(messageOf(result.data) || 'Top-up stub recorded. No money moved.');
    reload();
  }

  if (loading && !state) return <TableSkeleton />;
  if (state && !state.ok) {
    return <EmptyState title={`${meta.title} is unavailable`} body={state.error} action={<Button onClick={reload}>Try again</Button>} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={meta.kicker}
        title={meta.title}
        description={state?.ok ? state.blurb : undefined}
        actions={(
          <div className="flex gap-2">
            {slug === 'wallet' ? <Button variant="outline" onClick={() => void topUp()} disabled={pending}>Top up stub</Button> : null}
            {meta.action ? <Button onClick={() => setOpen(true)}>{meta.action}</Button> : null}
          </div>
        )}
      />
      <ModuleBody slug={slug} data={data} query={query} onQuery={setQuery} onMarkRead={(id) => void markRead(id)} />
      {writable ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent className="overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{meta.action}</SheetTitle>
              <SheetDescription>The server still checks the module and your role.</SheetDescription>
            </SheetHeader>
            <form onSubmit={submit} className="flex flex-1 flex-col gap-4 px-4 pb-4">
              <Fields slug={slug} />
              <SheetFooter className="px-0">
                <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

function ModuleBody({
  slug,
  data,
  query,
  onQuery,
  onMarkRead,
}: {
  slug: string;
  data: Record<string, unknown> | null;
  query: string;
  onQuery: (value: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const rows = useMemo(() => rowsFor(slug, data).filter((row) => matches(row, query)), [slug, data, query]);
  const columns = columnsFor(slug);
  const banner = bannerFor(slug, data);

  if (slug === 'attendance') {
    return (
      <div className="space-y-4">
        {banner}
        <EmptyState title="Clock-in is an action" body="Use Attendance action to clock in, save a geofence, or grant a travel day. A travel day counts only after a manager saves one." />
      </div>
    );
  }

  if (slug === 'onboarding') {
    const steps = asRows(data?.steps);
    const done = steps.filter((step) => step.done === true).length;
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Steps" value={steps.length} />
          <Metric label="Done" value={done} />
          <Metric label="Left" value={Math.max(steps.length - done, 0)} />
        </div>
        {steps.length === 0 ? (
          <EmptyState title="No checklist" body="Onboarding steps appear after the company row can be read." />
        ) : (
          <ol className="space-y-2">
            {steps.map((step) => (
              <li key={text(step.id)} className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/10">
                <p className="text-sm font-medium">{text(step.label)}</p>
                <StatusBadge value={step.done === true ? 'completed' : 'pending'} />
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {banner}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label={slug === 'wallet' ? 'Balance' : 'Rows'}
          value={slug === 'wallet' ? money(data?.balanceCents) : rows.length}
          hint={slug === 'wallet' ? 'This ledger' : query ? 'Matching search' : 'In this company'}
        />
        <Metric label="Module" value={slug} />
        <Metric label="Shown" value={columns.length} hint="Columns" />
      </div>
      <DataToolbar query={query} onQuery={onQuery} placeholder={`Search ${copy[slug]?.title.toLowerCase() ?? slug}`} />
      <RecordTable
        rows={rows}
        columns={columns}
        emptyTitle="Nothing in this view"
        emptyBody="When the server returns rows for this company, they show up here."
        actions={(row) => {
          const id = text(row.id, '');
          const items: { id: string; label: string; onSelect: () => void }[] = [];
          if (id) items.push({ id: 'copy', label: 'Copy id', onSelect: () => { void copyText(id, 'Id copied'); } });
          if (slug === 'notifications' && id && row.read !== true) {
            items.unshift({ id: 'read', label: 'Mark read', onSelect: () => { onMarkRead(id); } });
          }
          return items;
        }}
      />
    </div>
  );
}

function rowsFor(slug: string, data: Record<string, unknown> | null): Record<string, unknown>[] {
  if (!data) return [];
  if (slug === 'incidents') return asRows(data.incidents);
  if (slug === 'health') return asRows(data.scores);
  if (slug === 'wallet') return asRows(data.entries);
  if (slug === 'pos') return asRows(data.orders);
  if (slug === 'cctv') return asRows(data.cameras);
  if (slug === 'mini-apps') return asRows(data.installed);
  if (slug === 'find') return asRows(data.locations);
  if (slug === 'notifications') return asRows(data.notifications);
  if (slug === 'audit') return asRows(data.entries);
  if (slug === 'attendance') return [];
  return [];
}

function bannerFor(slug: string, data: Record<string, unknown> | null) {
  if (slug === 'attendance') {
    return <Callout title="Geofence clock-in" body={text(data?.note, 'Save a geofence, then clock in with device coordinates. Maps are not connected.')} />;
  }
  if (slug === 'wallet') return <Callout title="Ledger only" body={messageOf(data?.topUp) || 'Transaction Junction top-up is a stub and does not move money.'} />;
  if (slug === 'cctv') return <Callout title="No live stream" body="Cameras are a registry. Opening a row does not start video." />;
  if (slug === 'find') return <Callout title="Consented coordinates" body={messageOf(data?.map) || 'No map tiles are connected.'} />;
  if (slug === 'mini-apps') return <Callout title="Marketplace" body={messageOf(data?.provider) || 'No partner mini-apps are connected.'} />;
  if (slug === 'health') return <Callout title="Provisional score" body="Managers see a rules score. This is not an AI model." />;
  return null;
}

function columnsFor(slug: string): Column[] {
  if (slug === 'incidents') {
    return [
      { id: 'title', header: 'Incident', cell: (row) => <PersonCell name={text(row.title)} detail={text(row.location_label, 'No location')} /> },
      statusColumn('status'),
      { id: 'when', header: 'Opened', className: 'font-numeric text-xs', cell: (row) => formatWhen(row.created_at) },
    ];
  }
  if (slug === 'health') {
    return [
      { id: 'user', header: 'Person', cell: (row) => <PersonCell name={displayName(null, null, shortId(row.userId))} detail={shortId(row.userId)} /> },
      { id: 'score', header: 'Score', className: 'font-numeric', cell: (row) => text(row.score) },
      statusColumn('band', 'Band'),
      { id: 'misses', header: 'Misses', className: 'font-numeric', cell: (row) => text(row.misses, '0') },
      { id: 'late', header: 'Late', className: 'font-numeric', cell: (row) => text(row.late, '0') },
    ];
  }
  if (slug === 'wallet') {
    return [
      { id: 'amount', header: 'Amount', className: 'font-numeric', cell: (row) => money(row.amount_cents) },
      statusColumn('direction', 'Direction'),
      { id: 'source', header: 'Source', cell: (row) => text(row.source) },
      { id: 'memo', header: 'Memo', cell: (row) => text(row.memo, '') },
      { id: 'when', header: 'When', className: 'font-numeric text-xs', cell: (row) => formatWhen(row.created_at) },
    ];
  }
  if (slug === 'pos') {
    return [
      { id: 'table', header: 'Order', cell: (row) => <PersonCell name={text(row.table_label, 'Table')} detail={money(row.total_cents)} /> },
      statusColumn('status'),
      statusColumn('payment_status', 'Payment'),
      { id: 'when', header: 'Opened', className: 'font-numeric text-xs', cell: (row) => formatWhen(row.created_at) },
    ];
  }
  if (slug === 'cctv') {
    return [
      { id: 'name', header: 'Camera', cell: (row) => <PersonCell name={text(row.name)} detail={text(row.site_label, 'No site')} /> },
      { id: 'provider', header: 'Provider', cell: (row) => <StatusBadge value={text(row.provider, 'unconfigured')} /> },
      { id: 'stream', header: 'Stream', cell: (row) => messageOf(row.stream) || 'No stream' },
    ];
  }
  if (slug === 'mini-apps') {
    return [
      { id: 'name', header: 'Mini-app', cell: (row) => <PersonCell name={text(row.name)} detail={shortId(row.id)} /> },
      statusColumn('status'),
      { id: 'when', header: 'Added', className: 'font-numeric text-xs', cell: (row) => formatWhen(row.created_at) },
    ];
  }
  if (slug === 'find') {
    return [
      { id: 'user', header: 'Person', cell: (row) => <PersonCell name={shortId(row.user_id)} detail="Consented" /> },
      { id: 'lat', header: 'Latitude', className: 'font-numeric', cell: (row) => text(row.latitude) },
      { id: 'lng', header: 'Longitude', className: 'font-numeric', cell: (row) => text(row.longitude) },
      { id: 'when', header: 'Recorded', className: 'font-numeric text-xs', cell: (row) => formatWhen(row.recorded_at) },
    ];
  }
  if (slug === 'notifications') {
    return [
      { id: 'title', header: 'Notice', cell: (row) => <PersonCell name={text(row.title)} detail={text(row.message, '')} /> },
      { id: 'type', header: 'Type', cell: (row) => <StatusBadge value={text(row.type, 'notice')} /> },
      { id: 'read', header: 'State', cell: (row) => <StatusBadge value={row.read === true ? 'read' : 'open'} /> },
      { id: 'when', header: 'When', className: 'font-numeric text-xs', cell: (row) => formatWhen(row.created_at) },
    ];
  }
  if (slug === 'audit') {
    return [
      { id: 'action', header: 'Action', cell: (row) => <PersonCell name={text(row.action)} detail={text(row.entity_type, '')} /> },
      { id: 'entity', header: 'Entity', className: 'font-numeric text-xs', cell: (row) => shortId(row.entity_id) },
      { id: 'when', header: 'When', className: 'font-numeric text-xs', cell: (row) => formatWhen(row.created_at) },
    ];
  }
  return [
    { id: 'summary', header: 'Record', cell: (row) => text(row.id) },
  ];
}

function Fields({ slug }: { slug: string }) {
  if (slug === 'incidents') {
    return (
      <>
        <Field name="title" label="Title" required />
        <Field name="description" label="Description" />
        <Field name="locationLabel" label="Location label" />
      </>
    );
  }
  if (slug === 'attendance') return <AttendanceFields />;
  if (slug === 'health') return <HealthFields />;
  if (slug === 'wallet') return <WalletFields />;
  if (slug === 'pos') {
    return (
      <>
        <Field name="tableLabel" label="Table" required />
        <Field name="itemName" label="Item" />
        <Field name="qty" label="Quantity" />
        <Field name="totalCents" label="Total cents" />
      </>
    );
  }
  if (slug === 'cctv') {
    return (
      <>
        <Field name="name" label="Camera name" required />
        <Field name="siteLabel" label="Site" />
      </>
    );
  }
  if (slug === 'find') {
    return (
      <>
        <Field name="lat" label="Latitude" required />
        <Field name="lng" label="Longitude" required />
        <Field name="consent" label="Type true to store this location" required />
      </>
    );
  }
  return <p className="text-sm text-muted-foreground">This screen is read only.</p>;
}

function AttendanceFields() {
  const [intent, setIntent] = useState('clock');
  return (
    <>
      <input type="hidden" name="intent" value={intent} />
      <div className="space-y-2">
        <Label>Action</Label>
        <Select value={intent} onValueChange={(value) => setIntent(value ?? 'clock')}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="clock">Clock in</SelectItem>
            <SelectItem value="geofence">Save geofence</SelectItem>
            <SelectItem value="travel">Grant travel day</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {intent === 'geofence' ? <Field name="name" label="Geofence name" required /> : null}
      {intent !== 'travel' ? (
        <>
          <Field name="lat" label="Latitude" />
          <Field name="lng" label="Longitude" />
        </>
      ) : null}
      {intent === 'geofence' ? <Field name="radiusMeters" label="Radius in metres" /> : null}
      {intent === 'travel' ? (
        <>
          <Field name="userId" label="Person id" required />
          <Field name="workDate" label="Travel date" type="date" required />
          <Field name="reason" label="Reason" />
        </>
      ) : null}
    </>
  );
}

function HealthFields() {
  const [kind, setKind] = useState('miss');
  return (
    <>
      <Field name="userId" label="Person id" required />
      <input type="hidden" name="kind" value={kind} />
      <div className="space-y-2">
        <Label>Kind</Label>
        <Select value={kind} onValueChange={(value) => setKind(value ?? 'miss')}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="miss">Miss</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="proof_rejected">Proof rejected</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Field name="note" label="Note" />
    </>
  );
}

function WalletFields() {
  const [intent, setIntent] = useState('adjustment');
  const [direction, setDirection] = useState('credit');
  return (
    <>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="direction" value={direction} />
      <div className="space-y-2">
        <Label>Intent</Label>
        <Select value={intent} onValueChange={(value) => setIntent(value ?? 'adjustment')}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="adjustment">Manual adjustment</SelectItem>
            <SelectItem value="topup">Top-up stub</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {intent === 'adjustment' ? (
        <>
          <Field name="amountCents" label="Amount in cents" required />
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={direction} onValueChange={(value) => setDirection(value ?? 'credit')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field name="memo" label="Memo" />
        </>
      ) : (
        <Callout title="No money moves" body="Saving a top-up records the stub response. It does not call a live payment." />
      )}
    </>
  );
}
