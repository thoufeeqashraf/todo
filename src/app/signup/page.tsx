'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface Industry {
  id: string;
  display_name: string;
  description: string;
}

const regions = [
  { id: 'za', label: 'South Africa', detail: 'Default for the first markets' },
  { id: 'eu', label: 'Europe', detail: 'Company data stays in the EU setting' },
  { id: 'multi', label: 'Multi-region', detail: 'More than one hosting region' },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [formData, setFormData] = useState({
    companyName: '',
    industryId: '',
    region: 'za',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let ignore = false;
    fetch('/api/industries')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && Array.isArray(data)) setIndustries(data);
      })
      .catch(() => {
        if (!ignore) toast.error('Industries could not be loaded.');
      })
      .finally(() => {
        if (!ignore) setLoadingIndustries(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step === 1) {
      if (!formData.companyName || !formData.industryId || !formData.region) {
        setError('Add a company name and choose an industry.');
        return;
      }
      setStep(2);
      setError('');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          industryId: formData.industryId,
          region: formData.region,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      toast.success('Company created. Sign in with the admin you just added.');
      router.push('/customer-login?registered=true');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-canvas min-h-svh">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">Workplace</Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/customer-login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Step {step} of 2</p>
            <h1>{step === 1 ? 'Create the company' : 'Add the first admin'}</h1>
          </div>
          <div className="font-numeric text-sm text-muted-foreground">{step === 1 ? '01' : '02'}</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  className="h-10 max-w-md bg-card"
                  value={formData.companyName}
                  onChange={(event) => setFormData({ ...formData, companyName: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-3">
                <Label>Industry</Label>
                {loadingIndustries ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : industries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No industries are available until the database is configured.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {industries.map((industry) => {
                      const selected = formData.industryId === industry.id;
                      return (
                        <button
                          key={industry.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, industryId: industry.id })}
                          className={`rounded-xl bg-card/80 p-4 text-left shadow-sm ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md ${selected ? 'ring-primary' : 'ring-foreground/10'}`}
                        >
                          <p className="text-sm font-medium tracking-tight">{industry.display_name}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{industry.description}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Label>Region</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {regions.map((region) => {
                    const selected = formData.region === region.id;
                    return (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, region: region.id })}
                        className={`rounded-xl bg-card/80 p-4 text-left ring-1 transition-colors ${selected ? 'ring-primary' : 'ring-foreground/10'}`}
                      >
                        <p className="text-sm font-medium">{region.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{region.detail}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <Card className="max-w-xl bg-card/80">
              <CardHeader>
                <CardTitle>Admin account</CardTitle>
                <CardDescription>This person can invite the rest of the company.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" value={formData.firstName} onChange={(event) => setFormData({ ...formData, firstName: event.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" value={formData.lastName} onChange={(event) => setFormData({ ...formData, lastName: event.target.value })} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} required />
                  <p className="text-xs text-muted-foreground">At least 8 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })} required />
                </div>
              </CardContent>
            </Card>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            {step === 2 && (
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>Back</Button>
            )}
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : step === 1 ? 'Continue' : 'Create company'}</Button>
          </div>
        </form>
      </main>
    </div>
  );
}
