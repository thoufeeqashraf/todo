'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function InviteForm({ token }: { token: string }) {
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage('');
    try {
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
        const text = typeof body?.error?.message === 'string'
          ? body.error.message
          : typeof body?.error === 'string'
            ? body.error
            : 'Could not accept the invitation.';
        setMessage(text);
        toast.error(text);
        return;
      }
      setDone(true);
      toast.success('Account created');
    } catch {
      setMessage('Could not accept the invitation.');
      toast.error('Could not accept the invitation.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="app-canvas flex min-h-svh flex-col">
      <header className="glass flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">Workplace</Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <Card className="bg-card/85 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Join your company</CardTitle>
            <CardDescription>This invitation does not grant access to any other company. Email is not sent; the link itself is the invite.</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <p className="text-sm">
                Account created.{' '}
                <Link href="/customer-login" className="text-primary underline-offset-4 hover:underline">Sign in</Link>
              </p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" name="lastName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" minLength={8} required />
                  <p className="text-xs text-muted-foreground">At least 8 characters</p>
                </div>
                {message ? <p className="text-sm text-destructive">{message}</p> : null}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? 'Creating…' : 'Create account'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
