'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateTenantForm({
  industries,
}: {
  industries: { id: string; displayName: string; description: string | null }[];
}) {
  const [pending, setPending] = useState(false);
  const [invitePath, setInvitePath] = useState('');
  const [slug, setSlug] = useState('');

  async function submit(formData: FormData) {
    setPending(true);
    setInvitePath('');
    try {
      const res = await fetch('/api/owner/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: String(formData.get('companyName') || ''),
          industryId: String(formData.get('industryId') || ''),
          region: String(formData.get('region') || 'za'),
          adminEmail: String(formData.get('adminEmail') || ''),
          adminFirstName: String(formData.get('adminFirstName') || ''),
          adminLastName: String(formData.get('adminLastName') || ''),
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          data && typeof data === 'object' && 'error' in data && data.error && typeof data.error === 'object' && 'message' in data.error
            ? String(data.error.message)
            : 'Could not create the business.';
        throw new Error(message);
      }
      const created = data as { company?: { slug?: string }; invitation?: { invitePath?: string } };
      setSlug(created.company?.slug ?? '');
      setInvitePath(created.invitation?.invitePath ?? '');
      toast.success('Business created. Copy the admin invite. Email is not sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the business.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle>Company and first admin</CardTitle>
        <CardDescription>
          Industry defaults, plus staff, tasks, and notifications, are switched on so the admin can accept the invite.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Business name</Label>
            <Input id="companyName" name="companyName" required minLength={2} maxLength={255} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="industryId">Industry</Label>
              <select id="industryId" name="industryId" required className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm" defaultValue={industries[0]?.id ?? ''}>
                {industries.map((industry) => (
                  <option key={industry.id} value={industry.id}>
                    {industry.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="region">Region</Label>
              <select id="region" name="region" defaultValue="za" className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm">
                <option value="za">South Africa</option>
                <option value="eu">Europe</option>
                <option value="multi">Multi-region</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="adminFirstName">Admin first name</Label>
              <Input id="adminFirstName" name="adminFirstName" required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminLastName">Admin last name</Label>
              <Input id="adminLastName" name="adminLastName" required maxLength={100} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminEmail">Admin email</Label>
            <Input id="adminEmail" name="adminEmail" type="email" required maxLength={255} />
          </div>
          <Button type="submit" disabled={pending || industries.length === 0}>
            {pending ? 'Creating…' : 'Create and invite'}
          </Button>
          {invitePath ? (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <p className="font-medium">{slug}</p>
              <button
                type="button"
                className="mt-1 text-left text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}${invitePath}`);
                  toast.success('Invite link copied');
                }}
              >
                Copy {invitePath}
              </button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
