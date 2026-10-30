'use client';

import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { detailText, formatWhen, shortId } from './format';
import type { AuditEntry } from './load';

const windows = [
  { value: 'all', label: 'All time' },
  { value: 'day', label: 'Last 24 hours' },
  { value: 'week', label: 'Last 7 days' },
] as const;

function withinRange(createdAt: string, range: (typeof windows)[number]['value']) {
  if (range === 'all') return true;
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return false;
  const span = range === 'day' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return Date.now() - time <= span;
}

export function AuditLog({ entries, error }: { entries: AuditEntry[]; error: string | null }) {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const [entity, setEntity] = useState('all');
  const [range, setRange] = useState<(typeof windows)[number]['value']>('all');

  const actions = useMemo(() => [...new Set(entries.map((entry) => entry.action))].sort(), [entries]);
  const entities = useMemo(
    () => [...new Set(entries.map((entry) => entry.entityType).filter((value): value is string => Boolean(value)))].sort(),
    [entries],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (action !== 'all' && entry.action !== action) return false;
      if (entity !== 'all' && entry.entityType !== entity) return false;
      if (!withinRange(entry.createdAt, range)) return false;
      if (!needle) return true;
      const haystack = [
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.actorName,
        entry.actorEmail,
        entry.ipAddress,
        detailText(entry.changes),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [action, entries, entity, query, range]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search action, actor, entity"
          aria-label="Search audit log"
          className="lg:max-w-xs"
        />
        <Select value={action} onValueChange={(value) => setAction(value ?? 'all')}>
          <SelectTrigger className="lg:w-48" aria-label="Filter by action">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={(value) => setEntity(value ?? 'all')}>
          <SelectTrigger className="lg:w-44" aria-label="Filter by entity">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {entities.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(value) => setRange(value === 'day' || value === 'week' ? value : 'all')}>
          <SelectTrigger className="lg:w-40" aria-label="Filter by time">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {windows.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="font-numeric text-xs text-muted-foreground lg:ml-auto">
          {visible.length} shown · {entries.length} loaded
        </p>
      </div>

      {error ? (
        <EmptyState title="Audit log is unavailable" body={error} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No audit events yet"
          body="Actions such as invitations and module changes are written to audit_logs for this company. Nothing is stored yet."
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No matching events" body="Try another action, entity, or search." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-numeric text-xs whitespace-nowrap">{formatWhen(entry.createdAt)}</TableCell>
                  <TableCell>
                    <p className="font-medium">{entry.actorName}</p>
                    {entry.actorEmail ? <p className="text-xs text-muted-foreground">{entry.actorEmail}</p> : null}
                  </TableCell>
                  <TableCell className="font-numeric text-xs">{entry.action}</TableCell>
                  <TableCell>
                    <p className="capitalize">{entry.entityType || '—'}</p>
                    {entry.entityId ? <p className="font-numeric text-xs text-muted-foreground">{shortId(entry.entityId)}</p> : null}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{detailText(entry.changes)}</TableCell>
                  <TableCell className="font-numeric text-xs text-muted-foreground">{entry.ipAddress || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Latest 200 events for this company. Search and filters apply to that set.</p>
    </div>
  );
}
