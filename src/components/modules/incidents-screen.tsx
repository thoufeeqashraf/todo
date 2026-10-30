'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { createIncidentAction } from '@/components/modules/actions';
import { AreaField, CreateDialog, TextField } from '@/components/modules/create-dialog';
import { DataPanel } from '@/components/modules/data-panel';
import { FilterBar } from '@/components/modules/filter-bar';
import { formatWhen, indexPeople, matchesQuery } from '@/components/modules/format';
import { PageHeader } from '@/components/modules/page-header';
import { PersonCell } from '@/components/modules/person-cell';
import { StatGrid } from '@/components/modules/stat-grid';
import { StatusBadge } from '@/components/modules/status-badge';
import type { IncidentsData } from '@/components/modules/types';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
];

export function IncidentsScreen({ data }: { data: IncidentsData }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const people = useMemo(() => indexPeople(data.people), [data.people]);
  const rows = useMemo(
    () =>
      data.incidents.filter((incident) => {
        if (filter !== 'all' && incident.status !== filter) return false;
        return matchesQuery(query, [incident.title, incident.description, incident.location_label, incident.status]);
      }),
    [data.incidents, filter, query],
  );
  const openCount = data.incidents.filter((incident) => incident.status === 'open').length;
  const located = data.incidents.filter((incident) => incident.location_label).length;
  const unassigned = data.incidents.filter((incident) => !incident.assigned_to).length;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await createIncidentAction({ title, description, locationLabel });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Incident reported');
    setOpen(false);
    setTitle('');
    setDescription('');
    setLocationLabel('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Incidents"
        description="Tickets stay inside this company. Floor staff see what they reported. Managers see the company."
        actions={<Button onClick={() => setOpen(true)}>Report incident</Button>}
      />
      <StatGrid
        items={[
          { label: 'Open', value: String(openCount), hint: data.scope },
          { label: 'Visible', value: String(data.incidents.length), hint: 'Latest 200 rows' },
          { label: 'With a place', value: String(located), hint: 'Location label filled in' },
          { label: 'Unassigned', value: String(unassigned), hint: 'No assignee yet' },
        ]}
      />
      <FilterBar
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        options={filters}
        placeholder="Search incidents"
      />
      {data.incidents.length === 0 ? (
        <EmptyState title="No incidents yet" body="Report one when a site, shift, or guest needs a senior to see it." />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing matches" body="Clear the filter or search to see the rest of the list." />
      ) : (
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    <p className="font-medium">{incident.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {incident.location_label || 'No location'}
                      {incident.description ? ` · ${incident.description}` : ''}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={incident.status} />
                  </TableCell>
                  <TableCell>
                    <PersonCell person={people.get(incident.reported_by ?? '')} id={incident.reported_by} />
                  </TableCell>
                  <TableCell>
                    <PersonCell person={people.get(incident.assigned_to ?? '')} id={incident.assigned_to} />
                  </TableCell>
                  <TableCell className="font-numeric text-xs">{formatWhen(incident.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      )}
      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        title="Report an incident"
        description="It is stored for this company only."
        submitLabel="Report"
        pending={pending}
        onSubmit={onSubmit}
      >
        <TextField id="incident-title" label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <AreaField id="incident-description" label="What happened" value={description} onChange={(event) => setDescription(event.target.value)} />
        <TextField
          id="incident-location"
          label="Location label"
          value={locationLabel}
          onChange={(event) => setLocationLabel(event.target.value)}
          placeholder="Flat 21, loading dock, table 4"
        />
      </CreateDialog>
    </div>
  );
}
