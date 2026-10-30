'use client';

import { useMemo, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  filterProjectTasks,
  formatDate,
  formatDateTime,
  initials,
  isPastDue,
  taskColumns,
  type ProjectSnapshot,
  type ProjectTask,
  type TaskPriority,
} from './model';

const priorityVariant: Record<TaskPriority, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  urgent: 'destructive',
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

const columnTone: Record<ProjectTask['status'], string> = {
  todo: 'bg-muted-foreground',
  in_progress: 'bg-primary',
  completed: 'bg-chart-2',
  overdue: 'bg-destructive',
};

export function ProjectsBoard({ data }: { data: ProjectSnapshot }) {
  const [view, setView] = useState('board');
  const [projectId, setProjectId] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tasks = useMemo(
    () => filterProjectTasks(data.tasks, projectId, query),
    [data.tasks, projectId, query],
  );
  const selected = data.tasks.find((task) => task.id === selectedId) ?? null;
  const open = tasks.filter((task) => task.status === 'todo' || task.status === 'in_progress').length;
  const done = tasks.filter((task) => task.status === 'completed').length;
  const pastDue = tasks.filter((task) => isPastDue(task)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1>Projects</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Tasks for this company, grouped by department. Floor staff see the work they are on.
          </p>
        </div>
        <Tabs value={view} onValueChange={(value) => setView(value ?? 'board')}>
          <TabsList>
            <TabsTrigger value="board">
              <LayoutGrid />
              Board
            </TabsTrigger>
            <TabsTrigger value="list">
              <List />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Open" value={open} />
        <Metric label="Past due" value={pastDue} />
        <Metric label="Done" value={done} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className="w-full sm:max-w-xs"
        />
        <Select value={projectId} onValueChange={(value) => setProjectId(value ?? 'all')}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Project">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="none">No project</SelectItem>
            {data.projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks in this view"
          body="Projects are built from tasks. Create work on the tasks screen, or clear the filters."
        />
      ) : view === 'list' ? (
        <div className="overflow-hidden rounded-xl bg-card/80 shadow-sm ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => setSelectedId(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setSelectedId(task.id);
                  }}
                >
                  <TableCell>
                    <p className="font-medium">{task.title}</p>
                    {task.description ? <p className="line-clamp-1 text-xs text-muted-foreground">{task.description}</p> : null}
                  </TableCell>
                  <TableCell>{task.departmentName}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[task.priority]} className="capitalize">{task.priority}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{task.status.replace('_', ' ')}</TableCell>
                  <TableCell>{task.assigneeName ?? '—'}</TableCell>
                  <TableCell className="font-numeric text-xs">
                    {formatDate(task.dueDate)}
                    {isPastDue(task) ? <span className="mt-1 block text-destructive">Past due</span> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {taskColumns.map((column) => {
            const cards = tasks.filter((task) => task.status === column.id);
            return (
              <section key={column.id} className="flex w-72 shrink-0 flex-col rounded-2xl bg-muted/40 p-2 ring-1 ring-foreground/10">
                <header className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${columnTone[column.id]}`} />
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{column.label}</p>
                  </div>
                  <span className="font-numeric text-xs text-muted-foreground">{cards.length}</span>
                </header>
                <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto px-0.5 pb-1">
                  {cards.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nothing here</p>
                  ) : (
                    cards.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setSelectedId(task.id)}
                        className="rounded-xl bg-card p-3 text-left shadow-sm ring-1 ring-foreground/10 transition-colors hover:ring-foreground/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={priorityVariant[task.priority]} className="capitalize">{task.priority}</Badge>
                          {isPastDue(task) ? <span className="text-[11px] text-destructive">Past due</span> : null}
                        </div>
                        <p className="mt-2 font-medium leading-snug">{task.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.departmentName}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar size="sm">
                              <AvatarFallback>{initials(task.assigneeName)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate text-xs text-muted-foreground">{task.assigneeName ?? 'Unassigned'}</span>
                          </div>
                          <span className="font-numeric shrink-0 text-[11px] text-muted-foreground">{formatDate(task.dueDate)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent className="sm:max-w-md">
          {selected ? <TaskDetail task={selected} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card/80 px-4 py-3 shadow-sm ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-numeric text-2xl">{value}</p>
    </div>
  );
}

function TaskDetail({ task }: { task: ProjectTask }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>{task.title}</SheetTitle>
        <SheetDescription>{task.departmentName}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-wrap gap-2 px-4">
        <Badge variant={priorityVariant[task.priority]} className="capitalize">{task.priority}</Badge>
        <Badge variant="outline" className="capitalize">{task.status.replace('_', ' ')}</Badge>
        {isPastDue(task) ? <Badge variant="destructive">Past due</Badge> : null}
      </div>
      <dl className="grid grid-cols-[6.5rem_1fr] gap-y-3 px-4 text-sm">
        <dt className="text-muted-foreground">Assignee</dt>
        <dd>{task.assigneeName ?? 'Unassigned'}</dd>
        <dt className="text-muted-foreground">Due</dt>
        <dd className="font-numeric">{formatDateTime(task.dueDate)}</dd>
        <dt className="text-muted-foreground">Created</dt>
        <dd className="font-numeric">{formatDateTime(task.createdAt)}</dd>
      </dl>
      <div className="px-4 pb-4">
        <p className="text-xs text-muted-foreground">Description</p>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{task.description || 'No description.'}</p>
      </div>
    </>
  );
}
