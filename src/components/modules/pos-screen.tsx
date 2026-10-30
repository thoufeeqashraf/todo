'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { createOrderAction } from '@/components/modules/actions';
import { CreateDialog, TextField } from '@/components/modules/create-dialog';
import { DataPanel } from '@/components/modules/data-panel';
import { FilterBar } from '@/components/modules/filter-bar';
import { finiteNumber, formatMoney, formatOrderItems, formatWhen, indexPeople, matchesQuery } from '@/components/modules/format';
import { PageHeader } from '@/components/modules/page-header';
import { PersonCell } from '@/components/modules/person-cell';
import { StatGrid } from '@/components/modules/stat-grid';
import { StatusBadge } from '@/components/modules/status-badge';
import { StubNote } from '@/components/modules/stub-note';
import type { PosData } from '@/components/modules/types';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'paid', label: 'Paid' },
];

export function PosScreen({ data }: { data: PosData }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [tableLabel, setTableLabel] = useState('');
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState('1');
  const [total, setTotal] = useState('');
  const people = useMemo(() => indexPeople(data.people), [data.people]);
  const rows = useMemo(
    () =>
      data.orders.filter((order) => {
        if (filter === 'unpaid' || filter === 'paid') {
          if (order.payment_status !== filter) return false;
        } else if (filter !== 'all' && order.status !== filter) {
          return false;
        }
        return matchesQuery(query, [order.table_label, order.status, order.payment_status, formatOrderItems(order.items)]);
      }),
    [data.orders, filter, query],
  );
  const openOrders = data.orders.filter((order) => order.status === 'open').length;
  const unpaid = data.orders.filter((order) => order.payment_status === 'unpaid').length;
  const totalCents = data.orders.reduce((sum, order) => sum + (Number.isFinite(order.total_cents) ? order.total_cents : 0), 0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const totalCents = finiteNumber(total);
    const quantity = finiteNumber(qty);
    if (totalCents === null || !Number.isInteger(totalCents)) {
      toast.error('Total must be a whole number of cents.');
      return;
    }
    setPending(true);
    const result = await createOrderAction({
      tableLabel,
      itemName,
      qty: quantity === null ? 1 : quantity,
      totalCents,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Order opened');
    setOpen(false);
    setTableLabel('');
    setItemName('');
    setQty('1');
    setTotal('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Business"
        title="POS"
        description="Table orders for this company. Opening an order does not take payment. The capture provider is a stub."
        actions={<Button onClick={() => setOpen(true)}>New order</Button>}
      />
      <StubNote>Payment capture is not connected. New orders stay unpaid. Kitchen print and QR pay are not built.</StubNote>
      <StatGrid
        items={[
          { label: 'Open', value: String(openOrders), hint: 'Status open' },
          { label: 'Unpaid', value: String(unpaid), hint: 'Payment not captured' },
          { label: 'Orders', value: String(data.orders.length), hint: 'Latest 200 rows' },
          { label: 'Booked total', value: formatMoney(totalCents), hint: 'Sum of order totals' },
        ]}
      />
      <FilterBar query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} options={filters} placeholder="Search orders" />
      {data.orders.length === 0 ? (
        <EmptyState title="No orders" body="Open a table order when the floor starts a ticket. It will stay unpaid." />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing matches" body="Clear the filter or search to see the rest of the orders." />
      ) : (
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Opened by</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.table_label}</TableCell>
                  <TableCell className="max-w-56 text-sm text-muted-foreground">{formatOrderItems(order.items)}</TableCell>
                  <TableCell>
                    <StatusBadge value={order.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={order.payment_status} />
                  </TableCell>
                  <TableCell className="font-numeric">{formatMoney(order.total_cents)}</TableCell>
                  <TableCell>
                    <PersonCell person={people.get(order.created_by ?? '')} id={order.created_by} />
                  </TableCell>
                  <TableCell className="font-numeric text-xs">{formatWhen(order.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      )}
      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        title="Open an order"
        description="The order is saved unpaid. No payment provider is called."
        submitLabel="Open order"
        pending={pending}
        onSubmit={onSubmit}
      >
        <TextField id="pos-table" label="Table" value={tableLabel} onChange={(event) => setTableLabel(event.target.value)} required />
        <TextField id="pos-item" label="Item" value={itemName} onChange={(event) => setItemName(event.target.value)} />
        <TextField id="pos-qty" label="Quantity" value={qty} onChange={(event) => setQty(event.target.value)} inputMode="numeric" />
        <TextField id="pos-total" label="Total in cents" value={total} onChange={(event) => setTotal(event.target.value)} inputMode="numeric" required />
      </CreateDialog>
    </div>
  );
}
