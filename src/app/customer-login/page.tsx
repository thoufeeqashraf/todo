'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams?.get('registered') === 'true';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
    <div className="app-canvas flex min-h-svh flex-col">
      <header className="glass flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">Workplace</Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <Card className="bg-card/85 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Customer entrance for one company. Operators use a different gate.</CardDescription>
          </CardHeader>
          <CardContent>
            {registered && (
              <p className="mb-4 rounded-xl bg-primary/10 px-3 py-2 text-sm text-foreground">
                Company created. Sign in with the admin email.
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Signing in…' : 'Sign in'}</Button>
              <p className="text-center text-sm text-muted-foreground">
                Need a company? <Link href="/signup" className="text-primary underline-offset-4 hover:underline">Create one</Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Development operators use <Link href="/login" className="text-primary underline-offset-4 hover:underline">/login</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="app-canvas flex min-h-svh items-center justify-center"><Skeleton className="h-80 w-full max-w-md rounded-xl" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
