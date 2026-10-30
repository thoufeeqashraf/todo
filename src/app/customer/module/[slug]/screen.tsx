'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

import { loadModule, runModule } from '../../actions';

export function ModuleScreen({
  slug,
  initial,
}: {
  slug: string;
  initial: Awaited<ReturnType<typeof loadModule>>;
}) {
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
    setPending(true);
    const result = await runModule(slug, payload);
    setMessage(result.ok ? 'Saved.' : result.error);
    if (result.ok) toast.success('Saved');
    else toast.error(result.error);
    setPending(false);
    setState(await loadModule(slug));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="capitalize">{slug.replace('-', ' ')}</h1>
        {state?.ok && <p className="text-sm text-muted-foreground">{state.blurb}</p>}
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Update</CardTitle>
            <CardDescription>The server still checks the module and your role.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <Fields slug={slug} />
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
              <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
            </form>
          </CardContent>
        </Card>
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Company data</CardTitle>
            <CardDescription>What the server returned for this company.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80 rounded-lg bg-muted/50">
              <pre className="font-numeric p-3 text-xs">{JSON.stringify(state, null, 2)}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ name, label, type = 'text' }: { name: string; label: string; type?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} />
    </div>
  );
}

function Fields({ slug }: { slug: string }) {
  if (slug === 'staff') {
    return (
      <>
        <Field name="intent" label="intent: invite or department" />
        <Field name="email" label="Invite email" type="email" />
        <Field name="role" label="Role (admin, manager, or user)" />
        <Field name="name" label="Department name" />
      </>
    );
  }
  if (slug === 'scheduling') {
    return (
      <>
        <Field name="userId" label="User id" />
        <Field name="startTime" label="Start" type="datetime-local" />
        <Field name="endTime" label="End" type="datetime-local" />
        <Field name="shiftType" label="Shift type (regular or travel)" />
      </>
    );
  }
  if (slug === 'incidents') {
    return (
      <>
        <Field name="title" label="Title" />
        <Field name="description" label="Description" />
        <Field name="locationLabel" label="Location label" />
      </>
    );
  }
  if (slug === 'attendance') {
    return (
      <>
        <Field name="intent" label="Intent: clock, geofence, or travel" />
        <Field name="name" label="Geofence name" />
        <Field name="lat" label="Latitude" />
        <Field name="lng" label="Longitude" />
        <Field name="radiusMeters" label="Radius metres" />
        <Field name="userId" label="Travel-day user id" />
        <Field name="workDate" label="Travel date" type="date" />
        <Field name="reason" label="Travel reason" />
      </>
    );
  }
  if (slug === 'health') {
    return (
      <>
        <Field name="userId" label="User id" />
        <Field name="kind" label="Kind: miss, late, proof_rejected, complete" />
        <Field name="note" label="Note" />
      </>
    );
  }
  if (slug === 'wallet') {
    return (
      <>
        <Field name="intent" label="Intent: adjustment or topup" />
        <Field name="amountCents" label="Amount in cents" />
        <Field name="direction" label="credit or debit" />
        <Field name="memo" label="Memo" />
      </>
    );
  }
  if (slug === 'pos') {
    return (
      <>
        <Field name="tableLabel" label="Table" />
        <Field name="itemName" label="Item" />
        <Field name="qty" label="Quantity" />
        <Field name="totalCents" label="Total cents" />
      </>
    );
  }
  if (slug === 'cctv') {
    return (
      <>
        <Field name="name" label="Camera name" />
        <Field name="siteLabel" label="Site" />
      </>
    );
  }
  if (slug === 'find') {
    return (
      <>
        <Field name="lat" label="Latitude" />
        <Field name="lng" label="Longitude" />
        <Field name="consent" label="Type true to store this location" />
      </>
    );
  }
  if (slug === 'notifications') return <Field name="id" label="Notification id to mark read" />;
  if (slug === 'settings') {
    return (
      <>
        <Field name="name" label="Company name" />
        <Field name="region" label="Region: za, eu, or multi" />
      </>
    );
  }
  return <p className="text-sm text-muted-foreground">This screen is read only.</p>;
}
