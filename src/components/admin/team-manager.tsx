'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { createTeamInvitation } from '@/app/customer/team/actions';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { formatWhen, personName } from './format';
import type { TeamInvitation, TeamMember } from './load';
import { RoleBadge } from './role-badge';

const roles = [
  {
    id: 'admin',
    title: 'Admin',
    body: 'Turns modules on, reads the audit log, and can invite another admin.',
  },
  {
    id: 'manager',
    title: 'Manager',
    body: 'Invites users and managers when the staff module is on. Cannot invite an admin.',
  },
  {
    id: 'user',
    title: 'User',
    body: 'Sees their own work. Cannot invite people or open this page.',
  },
] as const;

function statusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'accepted') return 'default';
  if (status === 'pending') return 'secondary';
  if (status === 'cancelled') return 'destructive';
  return 'outline';
}

export function TeamManager({
  members,
  invitations,
  error,
}: {
  members: TeamMember[];
  invitations: TeamInvitation[];
  error: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('user');
  const [pending, setPending] = useState(false);
  const [invitePath, setInvitePath] = useState('');

  const needle = query.trim().toLowerCase();
  const visibleMembers = useMemo(() => {
    if (!needle) return members;
    return members.filter((member) => {
      const name = personName(member.firstName, member.lastName, '').toLowerCase();
      return name.includes(needle) || member.email.toLowerCase().includes(needle) || member.role.toLowerCase().includes(needle);
    });
  }, [members, needle]);
  const visibleInvites = useMemo(() => {
    return invitations.filter((invite) => {
      if (status !== 'all' && invite.status !== status) return false;
      if (!needle) return true;
      return invite.email.toLowerCase().includes(needle) || invite.role.toLowerCase().includes(needle);
    });
  }, [invitations, needle, status]);

  const counts = {
    admin: members.filter((member) => member.role === 'admin').length,
    manager: members.filter((member) => member.role === 'manager').length,
    user: members.filter((member) => member.role === 'user').length,
  };

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    setPending(true);
    const result = await createTeamInvitation(email, role);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setInvitePath(result.invitePath);
    setOpen(false);
    toast.success(result.emailSent ? 'Invitation created.' : 'Invitation created. Email is not sent.');
    router.refresh();
  }

  async function copyPath() {
    if (!invitePath) return;
    try {
      await navigator.clipboard.writeText(invitePath);
      toast.success('Invite path copied');
    } catch {
      toast.error('Could not copy the invite path.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, or role"
          aria-label="Search team"
          className="sm:max-w-xs"
        />
        <Button className="sm:ml-auto" onClick={() => setOpen(true)}>Invite</Button>
      </div>

      {invitePath ? (
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Invite link</CardTitle>
            <CardDescription>Share this path. Mail is not connected, so nothing is emailed.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <p className="font-numeric text-sm">{invitePath}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void copyPath()}>Copy</Button>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <EmptyState title="Team is unavailable" body={error} />
      ) : (
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="mt-4">
            {members.length === 0 ? (
              <EmptyState title="No members yet" body="The first admin is created at signup. Invite the rest from this page." />
            ) : visibleMembers.length === 0 ? (
              <EmptyState title="No matching members" body="Try another name, email, or role." />
            ) : (
              <div className="overflow-x-auto rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{personName(member.firstName, member.lastName)}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell><RoleBadge role={member.role} /></TableCell>
                        <TableCell>
                          <Badge variant={member.isActive ? 'secondary' : 'outline'}>{member.isActive ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell className="font-numeric text-xs">{formatWhen(member.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="invitations" className="mt-4 space-y-3">
            <Select value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter invitations by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {invitations.length === 0 ? (
              <EmptyState title="No invitations" body="Invite someone to create a pending invitation. The token stays on the server." />
            ) : visibleInvites.length === 0 ? (
              <EmptyState title="No matching invitations" body="Try another status or email." />
            ) : (
              <div className="overflow-x-auto rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleInvites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">{invite.email}</TableCell>
                        <TableCell><RoleBadge role={invite.role} /></TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(invite.status)} className="capitalize">{invite.status}</Badge>
                        </TableCell>
                        <TableCell className="font-numeric text-xs">{formatWhen(invite.expiresAt)}</TableCell>
                        <TableCell className="font-numeric text-xs">{formatWhen(invite.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="roles" className="mt-4">
            <div className="grid gap-3 md:grid-cols-3">
              {roles.map((item) => (
                <Card key={item.id} className="bg-card/80 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{item.title}</CardTitle>
                      <span className="font-numeric text-2xl">{counts[item.id]}</span>
                    </div>
                    <CardDescription>{item.body}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              A role is set when the invitation is created. Changing the role of someone who already joined is not available on an API yet.
            </p>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite someone</DialogTitle>
            <DialogDescription>
              Sends the email and role to POST /api/v1/invitations. The staff module has to be on. Email is not sent.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" name="email" type="email" required autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value ?? 'user')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Create invite'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
