'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { runModule } from '@/app/customer/actions';
import { EmptyState } from '@/components/empty-state';
import { Callout, DataTableFrame, DataToolbar, Metric, PageHeader, PersonCell, StatusBadge, TableSkeleton } from '@/components/features/chrome';
import { copyText, RowActions } from '@/components/features/row-actions';
import { asRows, displayName, payloadOf, text, type ModuleLoad } from '@/components/features/records';
import { useModuleData } from '@/components/features/use-module';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

type Department = { id: string; name: string; parent_id: string | null; manager_id: string | null };

export function StaffScreen({ initial }: { initial?: ModuleLoad }) {
  const { state, loading, reload } = useModuleData('staff', initial);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [selected, setSelected] = useState<Person | null>(null);
  const [invitePath, setInvitePath] = useState('');
  const [role, setRole] = useState('user');
  const [pending, setPending] = useState(false);

  const data = payloadOf(state);
  const people = useMemo<Person[]>(() => asRows(data?.users).map((row) => ({
    id: text(row.id, ''),
    email: text(row.email, ''),
    first_name: typeof row.first_name === 'string' ? row.first_name : null,
    last_name: typeof row.last_name === 'string' ? row.last_name : null,
    role: text(row.role, 'user'),
    is_active: row.is_active !== false,
  })), [data]);
  const departments = useMemo<Department[]>(() => asRows(data?.departments).map((row) => ({
    id: text(row.id, ''),
    name: text(row.name, 'Untitled'),
    parent_id: typeof row.parent_id === 'string' ? row.parent_id : null,
    manager_id: typeof row.manager_id === 'string' ? row.manager_id : null,
  })), [data]);

  const needle = query.trim().toLowerCase();
  const visiblePeople = people.filter((person) => {
    const name = displayName(person.first_name, person.last_name, person.email).toLowerCase();
    const matchesQuery = !needle || name.includes(needle) || person.email.toLowerCase().includes(needle);
    const matchesRole = roleFilter === 'all' || person.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? person.is_active : !person.is_active);
    return matchesQuery && matchesRole && matchesStatus;
  });
  const visibleDepartments = departments.filter((department) => !needle || department.name.toLowerCase().includes(needle));

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await runModule('staff', {
      intent: 'invite',
      email: String(form.get('email') ?? ''),
      role,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const path = result.data && typeof result.data === 'object' && 'invitePath' in result.data
      ? String((result.data as { invitePath?: string }).invitePath ?? '')
      : '';
    setInvitePath(path);
    setInviteOpen(false);
    toast.success('Invite created. Email is not sent.');
    reload();
  }

  async function addDepartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await runModule('staff', { intent: 'department', name: String(form.get('name') ?? '') });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Department added');
    setDeptOpen(false);
    reload();
  }

  if (loading && !state) return <TableSkeleton />;
  if (state && !state.ok) {
    return <EmptyState title="Staff is unavailable" body={state.error} action={<Button onClick={reload}>Try again</Button>} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="People"
        title="Staff"
        description={state?.ok ? state.blurb : 'People and departments in this company.'}
        actions={(
          <>
            <Button variant="outline" onClick={() => setDeptOpen(true)}>Department</Button>
            <Button onClick={() => setInviteOpen(true)}>Invite</Button>
          </>
        )}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="People" value={people.length} hint={`${people.filter((person) => person.is_active).length} active`} />
        <Metric label="Departments" value={departments.length} hint="Inside this company" />
        <Metric label="Admins" value={people.filter((person) => person.role === 'admin').length} hint="Can change modules" />
      </div>
      {invitePath ? (
        <Callout title="Invite link" body={`${invitePath} — share this path. It is not emailed.`} />
      ) : null}
      <Tabs defaultValue="people">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>
          <DataToolbar query={query} onQuery={setQuery} placeholder="Search name or email">
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value ?? 'all')}>
              <SelectTrigger className="w-32" aria-label="Role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'all')}>
              <SelectTrigger className="w-32" aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </DataToolbar>
        </div>
        <TabsContent value="people" className="mt-4">
          {visiblePeople.length === 0 ? (
            <EmptyState title="No people in this view" body="The first admin is created at signup. Invite the rest from here." action={<Button onClick={() => setInviteOpen(true)}>Invite</Button>} />
          ) : (
            <DataTableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePeople.map((person) => {
                    const name = displayName(person.first_name, person.last_name, person.email);
                    return (
                      <TableRow key={person.id}>
                        <TableCell><PersonCell name={name} detail={person.email} /></TableCell>
                        <TableCell><StatusBadge value={person.role} /></TableCell>
                        <TableCell><StatusBadge value={person.is_active ? 'active' : 'inactive'} /></TableCell>
                        <TableCell className="text-right">
                          <RowActions
                            label={`Actions for ${name}`}
                            items={[
                              { id: 'view', label: 'View profile', onSelect: () => setSelected(person) },
                              { id: 'copy', label: 'Copy email', onSelect: () => void copyText(person.email, 'Email copied') },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableFrame>
          )}
        </TabsContent>
        <TabsContent value="departments" className="mt-4">
          {visibleDepartments.length === 0 ? (
            <EmptyState title="No departments" body="Add a department when the company needs more than one team." action={<Button variant="outline" onClick={() => setDeptOpen(true)}>Add department</Button>} />
          ) : (
            <DataTableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDepartments.map((department) => {
                    const parent = departments.find((item) => item.id === department.parent_id);
                    const manager = people.find((person) => person.id === department.manager_id);
                    return (
                      <TableRow key={department.id}>
                        <TableCell className="font-medium">{department.name}</TableCell>
                        <TableCell>{parent?.name ?? 'Top level'}</TableCell>
                        <TableCell>
                          {manager ? <PersonCell name={displayName(manager.first_name, manager.last_name, manager.email)} detail={manager.role} /> : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableFrame>
          )}
        </TabsContent>
      </Tabs>
      {invitePath ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => void copyText(invitePath, 'Invite link copied')}>Copy invite link</Button>
        </div>
      ) : null}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite someone</DialogTitle>
            <DialogDescription>Managers and admins can invite. Only an admin can invite another admin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="off" />
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
              <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create invite'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Sheet open={deptOpen} onOpenChange={setDeptOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New department</SheetTitle>
            <SheetDescription>Departments stay inside this company. Ten-level visibility is not finished.</SheetDescription>
          </SheetHeader>
          <form onSubmit={addDepartment} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="department-name">Name</Label>
              <Input id="department-name" name="name" required />
            </div>
            <SheetFooter className="px-0">
              <Button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add department'}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      <Sheet open={Boolean(selected)} onOpenChange={(next) => { if (!next) setSelected(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selected ? displayName(selected.first_name, selected.last_name, selected.email) : 'Profile'}</SheetTitle>
            <SheetDescription>Read-only profile. Role changes happen through a new invite.</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="space-y-4 px-4">
              <PersonCell name={displayName(selected.first_name, selected.last_name, selected.email)} detail={selected.email} />
              <div className="flex gap-2">
                <StatusBadge value={selected.role} />
                <StatusBadge value={selected.is_active ? 'active' : 'inactive'} />
              </div>
              <Button variant="outline" onClick={() => void copyText(selected.email, 'Email copied')}>Copy email</Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
