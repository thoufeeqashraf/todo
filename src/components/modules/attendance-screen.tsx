'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { clockInAction, clockOutAction, grantTravelAction, saveGeofenceAction } from '@/components/modules/actions';
import { CreateDialog, TextField } from '@/components/modules/create-dialog';
import { DataPanel } from '@/components/modules/data-panel';
import { FilterBar } from '@/components/modules/filter-bar';
import { finiteNumber, formatPoint, formatWhen, indexPeople, matchesQuery } from '@/components/modules/format';
import { PageHeader } from '@/components/modules/page-header';
import { PeopleSelect } from '@/components/modules/people-select';
import { PersonCell } from '@/components/modules/person-cell';
import { StatGrid } from '@/components/modules/stat-grid';
import { StatusBadge } from '@/components/modules/status-badge';
import { StubNote } from '@/components/modules/stub-note';
import type { AttendanceData } from '@/components/modules/types';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'clocked_in', label: 'On site' },
  { id: 'clocked_out', label: 'Closed' },
  { id: 'late', label: 'Late' },
  { id: 'absent', label: 'Absent' },
];

export function AttendanceScreen({ data }: { data: AttendanceData }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [clockOpen, setClockOpen] = useState(false);
  const [fenceOpen, setFenceOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [fenceName, setFenceName] = useState('');
  const [fenceLat, setFenceLat] = useState('');
  const [fenceLng, setFenceLng] = useState('');
  const [radius, setRadius] = useState('100');
  const [travelUser, setTravelUser] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [reason, setReason] = useState('');
  const people = useMemo(() => indexPeople(data.people), [data.people]);
  const rows = useMemo(
    () =>
      data.rows.filter((row) => {
        if (filter !== 'all' && row.status !== filter) return false;
        const person = people.get(row.user_id);
        return matchesQuery(query, [person?.first_name, person?.last_name, person?.email, row.status, row.notes]);
      }),
    [data.rows, filter, people, query],
  );
  const onSite = data.rows.filter((row) => row.status === 'clocked_in').length;
  const closed = data.rows.filter((row) => row.status === 'clocked_out').length;
  const activeFences = data.geofences.filter((fence) => fence.active).length;

  async function clockIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const latitude = finiteNumber(lat);
    const longitude = finiteNumber(lng);
    if (latitude === null || longitude === null) {
      toast.error('Enter a latitude and longitude. Map lookup is not connected.');
      return;
    }
    setPending(true);
    const result = await clockInAction({ lat: latitude, lng: longitude });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Clocked in');
    setClockOpen(false);
  }

  async function clockOut() {
    setPending(true);
    const result = await clockOutAction();
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Clocked out');
  }

  async function saveFence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const latitude = finiteNumber(fenceLat);
    const longitude = finiteNumber(fenceLng);
    const radiusMeters = Number(radius);
    if (latitude === null || longitude === null || !Number.isInteger(radiusMeters)) {
      toast.error('Centre and radius must be numbers. Map lookup is not connected.');
      return;
    }
    setPending(true);
    const result = await saveGeofenceAction({ name: fenceName, lat: latitude, lng: longitude, radiusMeters });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Geofence saved');
    setFenceOpen(false);
    setFenceName('');
  }

  async function grantTravel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await grantTravelAction({ userId: travelUser, workDate, reason });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Travel day saved');
    setTravelOpen(false);
    setReason('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Attendance"
        description="Clock-in is accepted inside a company geofence, or on a travel day a manager already saved. Coordinates are typed in. No map provider is called."
        actions={
          <>
            {data.canGrantTravel ? (
              <Button variant="outline" onClick={() => setTravelOpen(true)}>
                Travel day
              </Button>
            ) : null}
            {data.canManageGeofence ? (
              <Button variant="outline" onClick={() => setFenceOpen(true)}>
                Geofence
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void clockOut()} disabled={pending}>
              Clock out
            </Button>
            <Button onClick={() => setClockOpen(true)}>Clock in</Button>
          </>
        }
      />
      <StubNote>{data.scope}. Outside the radius, clock-in is refused and nothing is written to the attendance log.</StubNote>
      <StatGrid
        items={[
          { label: 'On site', value: String(onSite), hint: 'Status clocked in' },
          { label: 'Closed', value: String(closed), hint: 'Clocked out' },
          { label: 'Geofences', value: String(activeFences), hint: `${data.geofences.length} saved` },
          { label: 'Travel days', value: String(data.travel.length), hint: 'Pre-approved exceptions' },
        ]}
      />
      {data.geofences.length === 0 ? (
        <EmptyState
          title="No geofence yet"
          body="An admin saves a centre and radius before on-site clock-in can succeed. Travel days still work without one."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.geofences.map((fence) => (
            <Card key={fence.id} className="bg-card/80 shadow-sm">
              <CardHeader>
                <CardTitle>{fence.name}</CardTitle>
                <CardDescription>{fence.active ? 'Active' : 'Inactive'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 font-numeric text-xs text-muted-foreground">
                <p>
                  {fence.latitude.toFixed(5)}, {fence.longitude.toFixed(5)}
                </p>
                <p>{fence.radius_meters} m radius</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <FilterBar
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        options={filters}
        placeholder="Search the log"
      />
      {data.rows.length === 0 ? (
        <EmptyState title="No clock events" body="Clock in with coordinates once a geofence or travel day allows it." />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing matches" body="Clear the filter or search to see the rest of the log." />
      ) : (
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clock in</TableHead>
                <TableHead>Clock out</TableHead>
                <TableHead>Coordinates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <PersonCell person={people.get(row.user_id)} id={row.user_id} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={row.status} />
                  </TableCell>
                  <TableCell className="font-numeric text-xs">{formatWhen(row.clock_in)}</TableCell>
                  <TableCell className="font-numeric text-xs">{formatWhen(row.clock_out)}</TableCell>
                  <TableCell className="max-w-48 text-xs text-muted-foreground">
                    <p className="font-numeric">{formatPoint(row.clock_in_location)}</p>
                    {row.notes ? <p>{row.notes.replace(/_/g, ' ')}</p> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      )}
      {data.travel.length > 0 ? (
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Travel day</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Approved by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.travel.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <PersonCell person={people.get(row.user_id)} id={row.user_id} />
                  </TableCell>
                  <TableCell className="font-numeric text-xs">{row.work_date}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.reason || '—'}</TableCell>
                  <TableCell>
                    <PersonCell person={people.get(row.approved_by ?? '')} id={row.approved_by} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      ) : null}
      <CreateDialog
        open={clockOpen}
        onOpenChange={setClockOpen}
        title="Clock in"
        description="Type the device coordinates. This screen does not call a map service."
        submitLabel="Clock in"
        pending={pending}
        onSubmit={clockIn}
      >
        <TextField id="clock-lat" label="Latitude" value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" required />
        <TextField id="clock-lng" label="Longitude" value={lng} onChange={(event) => setLng(event.target.value)} inputMode="decimal" required />
      </CreateDialog>
      <CreateDialog
        open={fenceOpen}
        onOpenChange={setFenceOpen}
        title="Save a geofence"
        description="Admins only. The centre is a pair of numbers, not a map pin."
        submitLabel="Save geofence"
        pending={pending}
        onSubmit={saveFence}
      >
        <TextField id="fence-name" label="Name" value={fenceName} onChange={(event) => setFenceName(event.target.value)} required />
        <TextField id="fence-lat" label="Latitude" value={fenceLat} onChange={(event) => setFenceLat(event.target.value)} inputMode="decimal" required />
        <TextField id="fence-lng" label="Longitude" value={fenceLng} onChange={(event) => setFenceLng(event.target.value)} inputMode="decimal" required />
        <TextField id="fence-radius" label="Radius in metres" value={radius} onChange={(event) => setRadius(event.target.value)} inputMode="numeric" required />
      </CreateDialog>
      <CreateDialog
        open={travelOpen}
        onOpenChange={setTravelOpen}
        title="Grant a travel day"
        description="Clock-in is allowed away from the premises for that date."
        submitLabel="Grant"
        pending={pending}
        onSubmit={grantTravel}
      >
        <PeopleSelect id="travel-user" people={data.people} value={travelUser} onChange={setTravelUser} />
        <TextField id="travel-date" label="Work date" type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} required />
        <TextField id="travel-reason" label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
      </CreateDialog>
    </div>
  );
}
