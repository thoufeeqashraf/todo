'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    setPending(false);
    setState(await loadModule(slug));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <Link href="/customer">
            <Button variant="ghost" size="sm" className="mb-2">← Back to Dashboard</Button>
          </Link>
          <h1 className="text-2xl font-semibold capitalize">{slug.replace('-', ' ')}</h1>
          {state?.ok && <p className="text-sm text-muted-foreground">{state.blurb}</p>}
        </div>
      </header>
      <main className="container mx-auto grid gap-6 px-6 py-8 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Update</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <Fields slug={slug} />
              {message && <p className="text-sm">{message}</p>}
              <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Company data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto text-xs">{JSON.stringify(state, null, 2)}</pre>
          </CardContent>
        </Card>
      </main>
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
