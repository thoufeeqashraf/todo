'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { recordHealthAction } from '@/components/modules/actions';
import { AreaField, CreateDialog } from '@/components/modules/create-dialog';
import { DataPanel } from '@/components/modules/data-panel';
import { FilterBar } from '@/components/modules/filter-bar';
import { formatWhen, indexPeople, matchesQuery, personName } from '@/components/modules/format';
import { PageHeader } from '@/components/modules/page-header';
import { PeopleSelect } from '@/components/modules/people-select';
import { PersonCell } from '@/components/modules/person-cell';
import { StatGrid } from '@/components/modules/stat-grid';
import { StatusBadge } from '@/components/modules/status-badge';
import { StubNote } from '@/components/modules/stub-note';
import type { HealthData } from '@/components/modules/types';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'miss', label: 'Miss' },
  { id: 'late', label: 'Late' },
  { id: 'proof_rejected', label: 'Proof' },
  { id: 'complete', label: 'Complete' },
];

export function HealthScreen({ data }: { data: HealthData }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [userId, setUserId] = useState('');
  const [kind, setKind] = useState('miss');
  const [note, setNote] = useState('');
  const people = useMemo(() => indexPeople(data.people), [data.people]);
  const scores = useMemo(() => indexPeopleScores(data), [data]);
  const rows = useMemo(
    () =>
      data.events.filter((event) => {
        if (filter !== 'all' && event.kind !== filter) return false;
        const person = people.get(event.user_id);
        return matchesQuery(query, [personName(person, ''), event.kind, event.note]);
      }),
    [data.events, filter, people, query],
  );
  const good = data.scores.filter((score) => score.band === 'good').length;
  const watch = data.scores.filter((score) => score.band === 'watch').length;
  const poor = data.scores.filter((score) => score.band === 'poor').length;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await recordHealthAction({ userId, kind, note });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Health event recorded');
    setOpen(false);
    setNote('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Staff health"
        description="Managers record misses, lateness, rejected proof, and completed work. The score uses provisional weights. It is not an AI model."
        actions={<Button onClick={() => setOpen(true)}>Record event</Button>}
      />
      <StubNote>Visible to managers and admins only. Floor staff do not see this page.</StubNote>
      <StatGrid
        items={[
          { label: 'Events', value: String(data.events.length), hint: 'Latest 200 rows' },
          { label: 'Good', value: String(good), hint: 'Score 80 or higher' },
          { label: 'Watch', value: String(watch), hint: 'Score 50 to 79' },
          { label: 'Poor', value: String(poor), hint: 'Score under 50' },
        ]}
      />
      <FilterBar
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        options={filters}
        placeholder="Search events"
      />
      {data.events.length === 0 ? (
        <EmptyState title="No health events" body="Record a miss, a late arrival, rejected proof, or a completion to start a score." />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing matches" body="Clear the filter or search to see the rest of the events." />
      ) : (
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Recorded by</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((event) => {
                const score = scores.get(event.user_id);
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <PersonCell person={people.get(event.user_id)} id={event.user_id} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={event.kind} />
                    </TableCell>
                    <TableCell>
                      {score ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-numeric text-sm">{score.score}</span>
                          <StatusBadge value={score.band} />
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="max-w-64 text-sm text-muted-foreground">{event.note || '—'}</TableCell>
                    <TableCell>
                      <PersonCell person={people.get(event.created_by ?? '')} id={event.created_by} />
                    </TableCell>
                    <TableCell className="font-numeric text-xs">{formatWhen(event.created_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataPanel>
      )}
      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        title="Record a health event"
        description="The rules score updates from these rows. Weights stay provisional."
        submitLabel="Record"
        pending={pending}
        onSubmit={onSubmit}
      >
        <PeopleSelect id="health-user" people={data.people} value={userId} onChange={setUserId} />
        <div className="space-y-2">
          <Label>Kind</Label>
          <Select value={kind} onValueChange={(value) => setKind(value ?? 'miss')}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="miss">Miss</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="proof_rejected">Proof rejected</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <AreaField id="health-note" label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
      </CreateDialog>
    </div>
  );
}

function indexPeopleScores(data: HealthData) {
  return new Map(data.scores.map((score) => [score.userId, score]));
}
