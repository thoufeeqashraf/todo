'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function InviteForm({ token }: { token: string }) {
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        password: String(form.get('password') ?? ''),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error?.message ?? 'Could not accept the invitation.');
      return;
    }
    setDone(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Join your company</CardTitle>
          <CardDescription>This invitation does not grant access to any other company.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm">
              Account created. <Link href="/customer-login" className="underline">Sign in</Link>
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              {message && <p className="text-sm">{message}</p>}
              <Button type="submit">Create account</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
