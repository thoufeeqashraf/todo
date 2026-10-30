'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: { id: string; first_name: string; last_name: string } | null;
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'my-tasks', label: 'Mine' },
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'Doing' },
  { id: 'completed', label: 'Done' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium', due_date: '' });

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
        const data = await res.json();
        if (!ignore && Array.isArray(data)) setTasks(data);
      } catch {
        if (!ignore) toast.error('Could not load tasks.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [filter, refreshKey]);

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      toast.error('Task was not created. The tasks module may be off.');
      return;
    }
    toast.success('Task created');
    setOpen(false);
    setFormData({ title: '', description: '', priority: 'medium', due_date: '' });
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Tasks</h1>
          <p className="text-sm text-muted-foreground">Floor staff see their own work. Managers see the company.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New task</Button>
      </div>
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {filters.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks in this view" body="Create one, or turn the tasks module on if the list never loads." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <p className="font-medium">{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{task.priority}</Badge></TableCell>
                  <TableCell className="capitalize">{task.status.replace('_', ' ')}</TableCell>
                  <TableCell>{task.assigned_to ? `${task.assigned_to.first_name} ${task.assigned_to.last_name}` : '—'}</TableCell>
                  <TableCell className="font-numeric text-xs">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>It stays inside this company.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createTask} className="space-y-4">
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
                className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            <DialogFooter>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
