'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { shareLocationAction } from '@/components/modules/actions';
import { CreateDialog, TextField } from '@/components/modules/create-dialog';
import { DataPanel } from '@/components/modules/data-panel';
import { finiteNumber, formatWhen, indexPeople, initials, matchesQuery, personName } from '@/components/modules/format';
import { PageHeader } from '@/components/modules/page-header';
import { PersonCell } from '@/components/modules/person-cell';
import { StatGrid } from '@/components/modules/stat-grid';
import { StubNote } from '@/components/modules/stub-note';
import type { FindStaffData, GeofenceRow, LocationRow } from '@/components/modules/types';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function FindStaffScreen({ data }: { data: FindStaffData }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [consent, setConsent] = useState(false);
  const people = useMemo(() => indexPeople(data.people), [data.people]);
  const latest = useMemo(() => {
    const map = new Map<string, LocationRow>();
    for (const location of data.locations) {
      if (!map.has(location.user_id)) map.set(location.user_id, location);
    }
    return [...map.values()];
  }, [data.locations]);
  const rows = useMemo(
    () =>
      data.locations.filter((location) => {
        const person = people.get(location.user_id);
        return matchesQuery(query, [personName(person, ''), location.source, String(location.latitude), String(location.longitude)]);
      }),
    [data.locations, people, query],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const latitude = finiteNumber(lat);
    const longitude = finiteNumber(lng);
    if (latitude === null || longitude === null) {
      toast.error('Enter coordinates. Map lookup is not connected.');
      return;
    }
    setPending(true);
    const result = await shareLocationAction({ lat: latitude, lng: longitude, consent });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Location stored');
    setOpen(false);
    setConsent(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Find My Staff"
        description={
          data.canSeeCompany
            ? 'Latest consented coordinates for this company. The plot is a schematic. Map tiles are not loaded.'
            : 'You see your own consented coordinates. Managers see the company. Map tiles are not loaded.'
        }
        actions={<Button onClick={() => setOpen(true)}>Share location</Button>}
      />
      <StubNote>{data.mapMessage}</StubNote>
      <StatGrid
        items={[
          { label: 'People plotted', value: String(latest.length), hint: 'Latest consented point each' },
          { label: 'History', value: String(data.locations.length), hint: 'Latest 100 consented rows' },
          { label: 'Geofences', value: String(data.geofences.length), hint: data.geofenceModuleOn ? 'Attendance module is on' : 'Attendance module is off' },
          { label: 'Map provider', value: 'None', hint: 'No network call' },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <MapStub locations={latest} geofences={data.geofences} people={people} viewerId={data.viewerId} />
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Geofences</CardTitle>
            <CardDescription>
              {data.geofenceModuleOn ? 'Company fences drawn on the plot.' : 'Turn on geofence attendance to list fences here.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.geofences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No geofences to plot.</p>
            ) : (
              data.geofences.map((fence) => (
                <div key={fence.id} className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="font-medium">{fence.name}</p>
                  <p className="font-numeric text-xs text-muted-foreground">
                    {fence.latitude.toFixed(5)}, {fence.longitude.toFixed(5)} · {fence.radius_meters} m
                    {fence.active ? '' : ' · inactive'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search locations"
          aria-label="Search locations"
          className="max-w-xs"
        />
      </div>
      {data.locations.length === 0 ? (
        <EmptyState title="No consented locations" body="Share a point with consent on. Coordinates without consent are not stored." />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing matches" body="Clear the search to see the location history." />
      ) : (
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <PersonCell person={people.get(location.user_id)} id={location.user_id} />
                  </TableCell>
                  <TableCell className="font-numeric text-xs">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </TableCell>
                  <TableCell className="capitalize">{location.source.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="font-numeric text-xs">{formatWhen(location.recorded_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      )}
      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        title="Share your location"
        description="Stored only for this company, and only when consent is checked. No map is queried."
        submitLabel="Store location"
        pending={pending}
        onSubmit={onSubmit}
      >
        <TextField id="share-lat" label="Latitude" value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" required />
        <TextField id="share-lng" label="Longitude" value={lng} onChange={(event) => setLng(event.target.value)} inputMode="decimal" required />
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
          <Label htmlFor="share-consent">I consent to store this point for authorised seniors</Label>
          <Switch id="share-consent" checked={consent} onCheckedChange={setConsent} />
        </div>
      </CreateDialog>
    </div>
  );
}

function MapStub({
  locations,
  geofences,
  people,
  viewerId,
}: {
  locations: LocationRow[];
  geofences: GeofenceRow[];
  people: Map<string, { first_name: string | null; last_name: string | null; email: string }>;
  viewerId: string;
}) {
  const points = [
    ...locations.map((location) => ({ lat: location.latitude, lng: location.longitude })),
    ...geofences.map((fence) => ({ lat: fence.latitude, lng: fence.longitude })),
  ];
  const placement = project(points);
  return (
    <figure
      className="relative h-96 overflow-hidden rounded-xl bg-muted/40 ring-1 ring-foreground/10"
      aria-label="Schematic plot of consented coordinates. Map tiles are not connected."
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in oklch, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 8%, transparent) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <figcaption className="absolute top-3 left-3 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground ring-1 ring-foreground/10">
        Schematic · no tiles
      </figcaption>
      {points.length === 0 ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Nothing to plot yet.
        </p>
      ) : null}
      {geofences.map((fence) => (
        <span
          key={fence.id}
          aria-hidden
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/50 bg-primary/10"
          style={{
            left: `${placement.left(fence.longitude)}%`,
            top: `${placement.top(fence.latitude)}%`,
            width: `${placement.radius(fence.radius_meters)}%`,
            height: `${placement.radius(fence.radius_meters)}%`,
          }}
          title={fence.name}
        />
      ))}
      {locations.map((location) => {
        const person = people.get(location.user_id);
        const name = personName(person, 'Staff');
        return (
          <span
            key={location.id}
            aria-hidden
            className={`absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-medium ring-2 ring-background ${
              location.user_id === viewerId ? 'bg-primary text-primary-foreground' : 'bg-foreground text-background'
            }`}
            style={{ left: `${placement.left(location.longitude)}%`, top: `${placement.top(location.latitude)}%` }}
            title={`${name} · ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
          >
            {initials(name)}
          </span>
        );
      })}
    </figure>
  );
}

function project(points: { lat: number; lng: number }[]) {
  if (points.length === 0) {
    return { left: () => 50, top: () => 50, radius: () => 12 };
  }
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lngSpan = Math.max(maxLng - minLng, 0.01);
  return {
    left: (lng: number) => 10 + ((lng - minLng) / lngSpan) * 80,
    top: (lat: number) => 10 + ((maxLat - lat) / latSpan) * 80,
    radius: (meters: number) => Math.max(8, Math.min(36, (meters / (latSpan * 111000)) * 80)),
  };
}
