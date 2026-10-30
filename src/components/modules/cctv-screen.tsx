'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { createCameraAction } from '@/components/modules/actions';
import { CreateDialog, TextField } from '@/components/modules/create-dialog';
import { DataPanel } from '@/components/modules/data-panel';
import { formatWhen, matchesQuery } from '@/components/modules/format';
import { PageHeader } from '@/components/modules/page-header';
import { StatGrid } from '@/components/modules/stat-grid';
import { StatusBadge } from '@/components/modules/status-badge';
import { StubNote } from '@/components/modules/stub-note';
import type { CctvData } from '@/components/modules/types';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function CctvScreen({ data }: { data: CctvData }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const cameras = useMemo(
    () => data.cameras.filter((camera) => matchesQuery(query, [camera.name, camera.site_label, camera.provider, camera.external_ref])),
    [data.cameras, query],
  );
  const sites = new Set(data.cameras.map((camera) => camera.site_label).filter(Boolean)).size;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await createCameraAction({ name, siteLabel });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? 'Camera registered');
    setOpen(false);
    setName('');
    setSiteLabel('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="CCTV"
        description="A registry of cameras for this company. Each tile is a placeholder. No stream URL is requested."
        actions={
          data.canRegister ? (
            <Button onClick={() => setOpen(true)}>Register camera</Button>
          ) : null
        }
      />
      <StubNote>{data.streamMessage}</StubNote>
      <StatGrid
        items={[
          { label: 'Cameras', value: String(data.cameras.length), hint: 'Registered names' },
          { label: 'Sites', value: String(sites), hint: 'Distinct site labels' },
          { label: 'Live feeds', value: '0', hint: 'Provider not connected' },
          { label: 'Placeholders', value: String(data.cameras.length), hint: 'Shown in the grid' },
        ]}
      />
      <div className="flex justify-end">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cameras"
          aria-label="Search cameras"
          className="max-w-xs"
        />
      </div>
      {data.cameras.length === 0 ? (
        <EmptyState title="No cameras" body="A manager can register a name and site. The tile stays a placeholder." />
      ) : cameras.length === 0 ? (
        <EmptyState title="Nothing matches" body="Clear the search to see the camera grid." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cameras.map((camera) => (
            <article key={camera.id} className="overflow-hidden rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
              <div className="relative aspect-video bg-zinc-950 text-zinc-100">
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,255,255,0.04) 10px, rgba(255,255,255,0.04) 11px)',
                  }}
                />
                <div className="absolute top-3 left-3 flex items-center gap-2 text-xs">
                  <span className="size-1.5 rounded-full bg-red-500" aria-hidden />
                  No feed
                </div>
                <p className="absolute inset-x-3 bottom-3 text-xs text-zinc-300">Placeholder · stream not connected</p>
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base">{camera.name}</h2>
                    <p className="text-xs text-muted-foreground">{camera.site_label || 'No site label'}</p>
                  </div>
                  <StatusBadge value={camera.provider || 'unconfigured'} />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{camera.streamMessage}</p>
              </div>
            </article>
          ))}
        </div>
      )}
      {cameras.length > 0 ? (
        <DataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camera</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cameras.map((camera) => (
                <TableRow key={camera.id}>
                  <TableCell className="font-medium">{camera.name}</TableCell>
                  <TableCell>{camera.site_label || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge value={camera.provider || 'unconfigured'} />
                  </TableCell>
                  <TableCell className="font-numeric text-xs">{camera.external_ref || '—'}</TableCell>
                  <TableCell className="font-numeric text-xs">{formatWhen(camera.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataPanel>
      ) : null}
      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        title="Register a camera"
        description="Managers and admins only. The provider stays unconfigured and no stream opens."
        submitLabel="Register"
        pending={pending}
        onSubmit={onSubmit}
      >
        <TextField id="camera-name" label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <TextField id="camera-site" label="Site label" value={siteLabel} onChange={(event) => setSiteLabel(event.target.value)} />
      </CreateDialog>
    </div>
  );
}
