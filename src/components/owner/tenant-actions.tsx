'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type ModuleItem = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string | null;
  enabled: boolean;
};

async function ownerFetch(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && data.error && typeof data.error === 'object' && 'message' in data.error
        ? String(data.error.message)
        : 'Request failed.';
    throw new Error(message);
  }
  return data;
}

export function TenantActions({
  companyId,
  name,
  industryId,
  region,
  status,
  modules,
  industries,
}: {
  companyId: string;
  name: string;
  industryId: string | null;
  region: string;
  status: 'active' | 'suspended';
  modules: ModuleItem[];
  industries: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [rows, setRows] = useState(modules);
  const [invitePath, setInvitePath] = useState('');

  async function saveProfile(formData: FormData) {
    setPending(true);
    try {
      await ownerFetch(`/api/owner/tenants/${companyId}`, 'PATCH', {
        name: String(formData.get('name') || ''),
        industryId: String(formData.get('industryId') || ''),
        region: String(formData.get('region') || 'za'),
      });
      toast.success('Business updated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the business.');
    } finally {
      setPending(false);
    }
  }

  async function setStatus(next: 'active' | 'suspended') {
    setPending(true);
    try {
      await ownerFetch(`/api/owner/tenants/${companyId}`, 'PATCH', { status: next });
      toast.success(next === 'suspended' ? 'Business suspended' : 'Business active again');
      setConfirm(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change status.');
    } finally {
      setPending(false);
    }
  }

  async function toggle(moduleId: string, enabled: boolean) {
    const previous = rows;
    setRows(rows.map((row) => (row.id === moduleId ? { ...row, enabled } : row)));
    try {
      await ownerFetch(`/api/owner/tenants/${companyId}/modules`, 'PATCH', { moduleId, isEnabled: enabled });
      toast.success(enabled ? 'Module on' : 'Module off');
    } catch (error) {
      setRows(previous);
      toast.error(error instanceof Error ? error.message : 'Could not change the module.');
    }
  }

  async function invite(formData: FormData) {
    setPending(true);
    try {
      const data = (await ownerFetch(`/api/owner/tenants/${companyId}/invitations`, 'POST', {
        email: String(formData.get('email') || ''),
        firstName: String(formData.get('firstName') || ''),
        lastName: String(formData.get('lastName') || ''),
      })) as { invitation?: { invitePath?: string } };
      const path = data.invitation?.invitePath ?? '';
      setInvitePath(path);
      toast.success('Admin invitation created. Email is not sent.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not invite the admin.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Name, industry, and data region. The slug stays as it was created.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveProfile} className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Business name</Label>
              <Input id="name" name="name" defaultValue={name} required minLength={2} maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industryId">Industry</Label>
              <select id="industryId" name="industryId" defaultValue={industryId ?? ''} className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm" required>
                {industries.map((industry) => (
                  <option key={industry.id} value={industry.id}>
                    {industry.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="region">Region</Label>
              <select id="region" name="region" defaultValue={region} className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm">
                <option value="za">South Africa</option>
                <option value="eu">Europe</option>
                <option value="multi">Multi-region</option>
              </select>
            </div>
            <Button type="submit" disabled={pending}>
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>{status === 'suspended' ? 'Suspended' : 'Active'}</CardTitle>
          <CardDescription>
            A suspended business cannot sign in. A platform owner still can, so this console stays reachable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" variant={status === 'suspended' ? 'default' : 'destructive'} onClick={() => setConfirm(true)} disabled={pending}>
            {status === 'suspended' ? 'Reactivate' : 'Suspend business'}
          </Button>
          <form action={invite} className="grid gap-3 border-t pt-4">
            <p className="text-sm font-medium">Invite an admin</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" required maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" required maxLength={100} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required maxLength={255} />
            </div>
            <Button type="submit" variant="outline" disabled={pending}>
              Create invite link
            </Button>
            {invitePath ? (
              <button
                type="button"
                className="truncate text-left text-xs text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}${invitePath}`);
                  toast.success('Invite link copied');
                }}
              >
                {invitePath}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">Email is not connected. Copy the link after it is created.</p>
            )}
          </form>
        </CardContent>
      </Card>
      <Card className="bg-card/80 shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>Turns modules on or off for this business only. The catalogue itself is not edited here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {rows.map((module) => (
            <label key={module.id} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2">
              <span>
                <span className="block text-sm font-medium">{module.displayName}</span>
                <span className="block text-xs text-muted-foreground">{module.description || module.category || module.name}</span>
              </span>
              <Switch checked={module.enabled} onCheckedChange={(checked) => void toggle(module.id, checked)} aria-label={module.displayName} />
            </label>
          ))}
        </CardContent>
      </Card>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{status === 'suspended' ? 'Reactivate this business?' : 'Suspend this business?'}</DialogTitle>
            <DialogDescription>
              {status === 'suspended'
                ? 'People in this company will be able to sign in again.'
                : 'People in this company will be refused at sign-in until you reactivate it.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button type="button" variant={status === 'suspended' ? 'default' : 'destructive'} disabled={pending} onClick={() => void setStatus(status === 'suspended' ? 'active' : 'suspended')}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
