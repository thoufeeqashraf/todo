'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Industry {
  id: string;
  display_name: string;
  description: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [industries, setIndustries] = useState<Industry[]>([]);

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
    fetch('/api/industries')
      .then(res => res.json())
      .then(data => setIndustries(data))
      .catch(err => console.error('Failed to load industries:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      if (!formData.companyName || !formData.industryId || !formData.region) {
        setError('Please fill in all company details');
        return;
      }
      setStep(2);
      setError('');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
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

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      router.push('/customer-login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Create your company account</CardTitle>
          <CardDescription>
            Step {step} of 2: {step === 1 ? 'Company details' : 'Your details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industryId">Industry</Label>
                  <select
                    id="industryId"
                    value={formData.industryId}
                    onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select your industry</option>
                    {industries.map((industry) => (
                      <option key={industry.id} value={industry.id}>
                        {industry.display_name}
                      </option>
                    ))}
                  </select>
                  {formData.industryId && (
                    <p className="text-xs text-muted-foreground">
                      {industries.find(i => i.id === formData.industryId)?.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <select
                    id="region"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="za">South Africa</option>
                    <option value="eu">Europe</option>
                    <option value="multi">Multi-region</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">At least 8 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-4">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Processing...' : step === 1 ? 'Next' : 'Create Account'}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/customer-login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
