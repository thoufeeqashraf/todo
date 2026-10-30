'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { loadModule, runModule } from '@/app/customer/actions';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Person = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
};

type Department = { id: string; name: string; parent_id: string | null };

export function StaffScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [invitePath, setInvitePath] = useState('');
  const [role, setRole] = useState('user');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const result = await loadModule('staff');
      if (ignore) return;
      if (!result.ok) {
        setError(result.error);
        setPeople([]);
        setDepartments([]);
      } else {
        const data = result.data as { users?: Person[]; departments?: Department[] };
        setPeople(data.users ?? []);
        setDepartments(data.departments ?? []);
        setError('');
      }
      setLoading(false);
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await runModule('staff', {
      intent: 'invite',
      email: String(form.get('email') ?? ''),
      role,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const path = (result.data as { invitePath?: string }).invitePath ?? '';
    setInvitePath(path);
    setInviteOpen(false);
    toast.success('Invite created. Email is not sent.');
    setRefreshKey((value) => value + 1);
  }

  async function addDepartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await runModule('staff', { intent: 'department', name: String(form.get('name') ?? '') });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Department added');
    setDeptOpen(false);
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Staff</h1>
          <p className="text-sm text-muted-foreground">People and departments in this company. Copy the invite link; mail is not connected.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDeptOpen(true)}>Department</Button>
          <Button onClick={() => setInviteOpen(true)}>Invite</Button>
        </div>
      </div>
      {invitePath ? (
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>Invite link</CardTitle>
            <CardDescription>Share this path. It expires with the invitation and is not emailed.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-numeric text-sm">{invitePath}</p>
          </CardContent>
        </Card>
      ) : null}
      {loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : error ? (
        <EmptyState title="Staff is unavailable" body={error} />
      ) : (
        <Tabs defaultValue="people">
          <TabsList>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>
          <TabsContent value="people" className="mt-4">
            {people.length === 0 ? (
              <EmptyState title="No people yet" body="The first admin is created at signup. Invite the rest from here." />
            ) : (
              <div className="overflow-hidden rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {people.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{`${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || '—'}</TableCell>
                        <TableCell>{person.email}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{person.role}</Badge></TableCell>
                        <TableCell>{person.is_active ? 'Active' : 'Inactive'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="departments" className="mt-4">
            {departments.length === 0 ? (
              <EmptyState title="No departments" body="Add a department when the company needs more than one team." />
            ) : (
              <div className="overflow-hidden rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Parent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((department) => (
                      <TableRow key={department.id}>
                        <TableCell className="font-medium">{department.name}</TableCell>
                        <TableCell className="font-numeric text-xs">{department.parent_id ? 'Nested' : 'Top level'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite someone</DialogTitle>
            <DialogDescription>Managers and admins can invite. Only an admin can invite another admin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
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
              <Button type="submit">Create invite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New department</DialogTitle>
            <DialogDescription>Departments stay inside this company. Ten-level visibility is not finished.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addDepartment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <DialogFooter>
              <Button type="submit">Add department</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
