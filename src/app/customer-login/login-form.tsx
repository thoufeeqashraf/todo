'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams?.get('registered') === 'true';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!emailPattern.test(formData.email.trim())) {
      setError('Invalid email address');
      toast.error('Invalid email address');
      return;
    }
    if (!formData.password) {
      setError('Enter a password.');
      toast.error('Enter a password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      toast.success('Signed in');
      router.push('/customer');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-card/85 shadow-lg shadow-primary/5">
      <CardHeader>
        <CardTitle>
          <h1 className="text-base font-medium tracking-tight">Sign in</h1>
        </CardTitle>
        <CardDescription>Customer entrance for one company. Operators use a different gate.</CardDescription>
      </CardHeader>
      <CardContent>
        {registered ? (
          <p className="mb-4 rounded-xl bg-primary/10 px-3 py-2 text-sm text-foreground">
            Company created. Sign in with the admin email.
          </p>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-10"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              aria-invalid={Boolean(error) && !emailPattern.test(formData.email.trim())}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="h-10"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              aria-invalid={Boolean(error) && !formData.password}
              required
            />
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading} className="h-10 w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Need a company? <Link href="/signup" className="text-primary underline-offset-4 hover:underline">Create one</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Development operators use <Link href="/login" className="text-primary underline-offset-4 hover:underline">/login</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
