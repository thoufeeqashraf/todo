'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { DataTableFrame, DataToolbar, Metric, PageHeader, PersonCell, StatusBadge, TableSkeleton } from '@/components/features/chrome';
import { copyText, RowActions } from '@/components/features/row-actions';
import { displayName, formatWhen } from '@/components/features/records';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: { id: string; first_name: string; last_name: string; email?: string } | null;
  assigned_by?: { id: string; first_name: string; last_name: string; email?: string } | null;
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'my-tasks', label: 'Mine' },
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'Doing' },
  { id: 'completed', label: 'Done' },
];

const emptyForm = { title: '', description: '', priority: 'medium', due_date: '' };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('all');
  const [priority, setPriority] = useState('all');
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [pending, setPending] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const url = filter === 'my-tasks'
          ? '/api/tasks?assigned_to_me=true'
          : filter !== 'all'
            ? `/api/tasks?status=${filter}`
            : '/api/tasks';
        const res = await fetch(url);
        const data: unknown = await res.json();
        if (ignore) return;
        if (!res.ok || !Array.isArray(data)) {
          const message = data && typeof data === 'object' && 'error' in data ? String((data as { error?: string }).error) : 'Could not load tasks.';
          toast.error(message);
          setTasks([]);
          return;
        }
        setTasks(data as Task[]);
      } catch {
        if (!ignore) toast.error('Could not load tasks.');
      } finally {
        if (!ignore) setLoaded(true);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [filter, refreshKey]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const assignee = task.assigned_to ? displayName(task.assigned_to.first_name, task.assigned_to.last_name) : '';
      const matchesQuery = !needle || task.title.toLowerCase().includes(needle) || (task.description ?? '').toLowerCase().includes(needle) || assignee.toLowerCase().includes(needle);
      const matchesPriority = priority === 'all' || task.priority === priority;
      return matchesQuery && matchesPriority;
    });
  }, [tasks, query, priority]);

  const openCount = tasks.filter((task) => task.status === 'todo' || task.status === 'in_progress').length;

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setPending(false);
    if (!res.ok) {
      toast.error('Task was not created. The tasks module may be off.');
      return;
    }
    toast.success('Task created');
    setOpen(false);
    setFormData(emptyForm);
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Work"
        title="Tasks"
        description="Floor staff see their own work. Managers see the company."
        actions={<Button onClick={() => setOpen(true)}>New task</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="In this view" value={loaded ? tasks.length : '—'} hint={filters.find((item) => item.id === filter)?.label} />
        <Metric label="Still open" value={loaded ? openCount : '—'} hint="To do and in progress" />
        <Metric label="Showing" value={loaded ? visible.length : '—'} hint={query || priority !== 'all' ? 'After search and priority' : 'No extra filter'} />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            {filters.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <DataToolbar query={query} onQuery={setQuery} placeholder="Search tasks">
          <Select value={priority} onValueChange={(value) => setPriority(value ?? 'all')}>
            <SelectTrigger className="w-36" aria-label="Priority"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </DataToolbar>
      </div>
      {!loaded ? (
        <TableSkeleton rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No tasks in this view"
          body="Create one, change the filter, or turn the tasks module on if the list never loads."
          action={<Button onClick={() => setOpen(true)}>New task</Button>}
        />
      ) : (
        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((task) => {
                const assignee = task.assigned_to ? displayName(task.assigned_to.first_name, task.assigned_to.last_name, task.assigned_to.email) : null;
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <p className="font-medium">{task.title}</p>
                      {task.description ? <p className="line-clamp-1 text-xs text-muted-foreground">{task.description}</p> : null}
                    </TableCell>
                    <TableCell><StatusBadge value={task.priority} /></TableCell>
                    <TableCell><StatusBadge value={task.status} /></TableCell>
                    <TableCell>{assignee ? <PersonCell name={assignee} /> : <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell className="font-numeric text-xs">{task.due_date ? formatWhen(task.due_date) : '—'}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={`Actions for ${task.title}`}
                        items={[
                          { id: 'view', label: 'View', onSelect: () => setSelected(task) },
                          { id: 'copy', label: 'Copy title', onSelect: () => void copyText(task.title, 'Title copied') },
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
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New task</SheetTitle>
            <SheetDescription>It stays inside this company.</SheetDescription>
          </SheetHeader>
          <form onSubmit={createTask} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value ?? 'medium' })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due</Label>
                <Input id="due_date" type="datetime-local" value={formData.due_date} onChange={(event) => setFormData({ ...formData, due_date: event.target.value })} />
              </div>
            </div>
            <SheetFooter className="px-0">
              <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create task'}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      <Sheet open={Boolean(selected)} onOpenChange={(next) => { if (!next) setSelected(null); }}>
        <SheetContent>
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>{selected.description || 'No description.'}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={selected.status} />
                  <StatusBadge value={selected.priority} />
                </div>
                <p className="text-sm text-muted-foreground">Due {selected.due_date ? formatWhen(selected.due_date) : 'whenever'}</p>
                {selected.assigned_to ? (
                  <PersonCell name={displayName(selected.assigned_to.first_name, selected.assigned_to.last_name, selected.assigned_to.email)} detail="Assignee" />
                ) : <p className="text-sm text-muted-foreground">Unassigned</p>}
                {selected.assigned_by ? (
                  <PersonCell name={displayName(selected.assigned_by.first_name, selected.assigned_by.last_name, selected.assigned_by.email)} detail="Assigned by" />
                ) : null}
                <Button variant="outline" onClick={() => void copyText(selected.title, 'Title copied')}>Copy title</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
