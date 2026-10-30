'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { saveClient } from './actions';
import { filterClients, formatDate, type ClientRecord, type ClientsSnapshot, type ClientStatus } from './model';

const statusVariant: Record<ClientStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  lead: 'secondary',
  paused: 'outline',
};

const blank = {
  id: undefined as string | undefined,
  name: '',
  organization: '',
  email: '',
  phone: '',
  status: 'active' as ClientStatus,
  notes: '',
};

export function ClientsDirectory({ data }: { data: ClientsSnapshot }) {
  const [clients, setClients] = useState(data.clients);
  const [status, setStatus] = useState<'all' | ClientStatus>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => filterClients(clients, status, query), [clients, status, query]);
  const selected = clients.find((client) => client.id === selectedId) ?? null;
  const counts = {
    lead: clients.filter((client) => client.status === 'lead').length,
    active: clients.filter((client) => client.status === 'active').length,
    paused: clients.filter((client) => client.status === 'paused').length,
  };

  function beginCreate() {
    setForm(blank);
    setOpen(true);
  }

  function beginEdit(client: ClientRecord) {
    setForm({
      id: client.id,
      name: client.name,
      organization: client.organization,
      email: client.email,
      phone: client.phone,
      status: client.status,
      notes: client.notes,
    });
    setSelectedId(null);
    setOpen(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveClient(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setClients(result.clients);
      setOpen(false);
      toast.success(form.id ? 'Client updated' : 'Client added');
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1>Clients</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Accounts this company works with. {data.canManage ? 'Managers can add and update them.' : 'Ask a manager to add an account.'}
          </p>
        </div>
        {data.canManage ? <Button onClick={beginCreate}>New client</Button> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Active" value={counts.active} />
        <Metric label="Leads" value={counts.lead} />
        <Metric label="Paused" value={counts.paused} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(value) => setStatus((value as 'all' | ClientStatus | null) ?? 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="lead">Leads</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, organisation"
          aria-label="Search clients"
          className="w-full sm:max-w-xs"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={clients.length === 0 ? 'No clients yet' : 'No clients match'}
          body={
            clients.length === 0
              ? data.canManage
                ? 'Add the first account for this company. Records stay inside the company.'
                : 'No accounts yet. A manager can add them.'
              : 'Try another status or clear the search.'
          }
          action={data.canManage && clients.length === 0 ? <Button onClick={beginCreate}>New client</Button> : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => setSelectedId(client.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setSelectedId(client.id);
                  }}
                >
                  <TableCell>
                    <p className="font-medium">{client.name}</p>
                    {client.phone ? <p className="font-numeric text-xs text-muted-foreground">{client.phone}</p> : null}
                  </TableCell>
                  <TableCell>{client.organization || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[client.status]} className="capitalize">{client.status}</Badge>
                  </TableCell>
                  <TableCell>{client.email || '—'}</TableCell>
                  <TableCell className="font-numeric text-xs">{formatDate(client.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(next) => { if (!next) setSelectedId(null); }}>
        <SheetContent className="sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>{selected.organization || 'No organisation'}</SheetDescription>
              </SheetHeader>
              <div className="px-4">
                <Badge variant={statusVariant[selected.status]} className="capitalize">{selected.status}</Badge>
              </div>
              <dl className="grid grid-cols-[7rem_1fr] gap-y-3 px-4 text-sm">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{selected.email || '—'}</dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-numeric">{selected.phone || '—'}</dd>
                <dt className="text-muted-foreground">Added</dt>
                <dd className="font-numeric">{formatDate(selected.createdAt)}</dd>
              </dl>
              <div className="px-4">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{selected.notes || 'No notes.'}</p>
              </div>
              {data.canManage ? (
                <div className="mt-auto px-4 pb-4">
                  <Button variant="outline" onClick={() => beginEdit(selected)}>Edit client</Button>
                </div>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit client' : 'New client'}</DialogTitle>
            <DialogDescription>Stored for this company only.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Name</Label>
              <Input id="client-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-org">Organisation</Label>
              <Input id="client-org" value={form.organization} onChange={(event) => setForm({ ...form, organization: event.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input id="client-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Phone</Label>
                <Input id="client-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: (value as ClientStatus | null) ?? 'active' })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-notes">Notes</Label>
              <textarea
                id="client-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>{pending ? 'Saving' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card/80 px-4 py-3 shadow-sm ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-numeric text-2xl">{value}</p>
    </div>
  );
}
