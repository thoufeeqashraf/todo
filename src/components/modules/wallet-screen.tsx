'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { adjustWalletAction, topUpWalletAction } from '@/components/modules/actions';
import { CreateDialog, TextField } from '@/components/modules/create-dialog';
import { DataPanel } from '@/components/modules/data-panel';
import { FilterBar } from '@/components/modules/filter-bar';
import { finiteNumber, formatMoney, formatWhen, indexPeople, matchesQuery } from '@/components/modules/format';
import { PageHeader } from '@/components/modules/page-header';
import { PersonCell } from '@/components/modules/person-cell';
import { StatGrid } from '@/components/modules/stat-grid';
import { StatusBadge } from '@/components/modules/status-badge';
import { StubNote } from '@/components/modules/stub-note';
import type { WalletData } from '@/components/modules/types';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'credit', label: 'Credits' },
  { id: 'debit', label: 'Debits' },
];

export function WalletScreen({ data }: { data: WalletData }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState('credit');
  const [memo, setMemo] = useState('');
  const people = useMemo(() => indexPeople(data.people), [data.people]);
  const rows = useMemo(
    () =>
      data.entries.filter((entry) => {
        if (filter !== 'all' && entry.direction !== filter) return false;
        const person = people.get(entry.user_id);
        return matchesQuery(query, [entry.memo, entry.source, entry.direction, person?.first_name, person?.last_name, person?.email]);
      }),
    [data.entries, filter, people, query],
  );
  const credits = data.entries.filter((entry) => entry.direction === 'credit').reduce((sum, entry) => sum + entry.amount_cents, 0);
  const debits = data.entries.filter((entry) => entry.direction === 'debit').reduce((sum, entry) => sum + entry.amount_cents, 0);

  async function adjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = finiteNumber(amount);
    if (amountCents === null || !Number.isInteger(amountCents)) {
      toast.error('Amount must be a whole number of cents.');
      return;
    }
    setPending(true);
    const result = await adjustWalletAction({ amountCents, direction, memo });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Ledger line posted');
    setOpen(false);
    setAmount('');
    setMemo('');
  }

  async function topUp() {
    setPending(true);
    const result = await topUpWalletAction();
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.message(result.message ?? 'Top-up did not move money.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Business"
        title="Wallet"
        description="This is an internal ledger in cents. A top-up calls the Transaction Junction stub and does not move money."
        actions={
          <>
            <Button variant="outline" onClick={() => void topUp()} disabled={pending}>
              Top up
            </Button>
            {data.canAdjust ? <Button onClick={() => setOpen(true)}>Post adjustment</Button> : null}
          </>
        }
      />
      <StubNote>
        Transaction Junction is not connected. Top-up, payout, and QR pay do not move money. Admins can post a manual ledger line on their own account.
      </StubNote>
      <StatGrid
        items={[
          { label: 'Your balance', value: formatMoney(data.balanceCents, data.currency), hint: data.currency },
          { label: 'Credits', value: formatMoney(credits, data.currency), hint: 'Visible lines' },
          { label: 'Debits', value: formatMoney(debits, data.currency), hint: 'Visible lines' },
          { label: 'Accounts', value: String(data.accounts.length), hint: data.canAdjust ? 'Company ledger' : 'Your account' },
        ]}
      />
      {data.canAdjust && data.accounts.length > 0 ? (
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <PersonCell person={people.get(account.user_id)} id={account.user_id} />
                  </TableCell>
                  <TableCell className="font-numeric text-xs">{account.currency}</TableCell>
                  <TableCell className="font-numeric">{formatMoney(account.balanceCents, account.currency)}</TableCell>
                  <TableCell className="font-numeric text-xs">{account.entryCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      ) : null}
      <FilterBar
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        options={filters}
        placeholder="Search the ledger"
      />
      {data.entries.length === 0 ? (
        <EmptyState
          title="No ledger lines"
          body="An admin adjustment opens your account and posts the first line. Top-up does not create a balance."
        />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing matches" body="Clear the filter or search to see the rest of the ledger." />
      ) : (
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <PersonCell person={people.get(entry.user_id)} id={entry.user_id} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={entry.direction} />
                  </TableCell>
                  <TableCell className="font-numeric">{formatMoney(entry.amount_cents, entry.currency)}</TableCell>
                  <TableCell>
                    <p className="font-medium capitalize">{entry.source.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{entry.memo || 'No memo'}</p>
                  </TableCell>
                  <TableCell className="font-numeric text-xs">{formatWhen(entry.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      )}
      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        title="Post a ledger line"
        description="Admins only. This changes the internal balance. It does not call a bank."
        submitLabel="Post"
        pending={pending}
        onSubmit={adjust}
      >
        <TextField
          id="wallet-amount"
          label="Amount in cents"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="numeric"
          required
        />
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select value={direction} onValueChange={(value) => setDirection(value ?? 'credit')}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TextField id="wallet-memo" label="Memo" value={memo} onChange={(event) => setMemo(event.target.value)} />
      </CreateDialog>
    </div>
  );
}
