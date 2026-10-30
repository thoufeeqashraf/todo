'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { runModule } from '@/app/customer/actions';
import { EmptyState } from '@/components/empty-state';
import { Callout, DataToolbar, Metric, PageHeader, PersonCell, StatusBadge, TableSkeleton } from '@/components/features/chrome';
import { copyText } from '@/components/features/row-actions';
import { asRows, displayName, formatWhen, payloadOf, text, type ModuleLoad } from '@/components/features/records';
import { useModuleData } from '@/components/features/use-module';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type Person = { id: string; name: string; email: string; role: string };
type Shift = {
  id: string;
  userId: string;
  start: string;
  end: string;
  shiftType: string;
  status: string;
  notes: string;
};

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function localInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function clock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function SchedulingBoard({ initial }: { initial?: ModuleLoad }) {
  const { state, loading, reload } = useModuleData('scheduling', initial);
  const [cursor, setCursor] = useState(() => startOfWeek(new Date()));
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [userId, setUserId] = useState('');
  const [shiftType, setShiftType] = useState('regular');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const data = payloadOf(state);
  const people = useMemo<Person[]>(() => asRows(data?.users).map((row) => ({
    id: text(row.id, ''),
    name: displayName(row.first_name, row.last_name, row.email),
    email: text(row.email, ''),
    role: text(row.role, 'user'),
  })).filter((person) => person.id), [data]);
  const shifts = useMemo<Shift[]>(() => asRows(data?.schedules).map((row) => ({
    id: text(row.id, ''),
    userId: text(row.user_id, ''),
    start: text(row.start_time, ''),
    end: text(row.end_time, ''),
    shiftType: text(row.shift_type, 'regular'),
    status: text(row.status, 'scheduled'),
    notes: text(row.notes, ''),
  })).filter((shift) => shift.userId), [data]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(cursor, index)), [cursor]);
  const weekEnd = days[6];
  const visiblePeople = useMemo(() => {
    const known = new Map(people.map((person) => [person.id, person]));
    for (const shift of shifts) {
      if (!known.has(shift.userId)) {
        known.set(shift.userId, { id: shift.userId, name: 'Unassigned profile', email: shift.userId, role: 'user' });
      }
    }
    const needle = query.trim().toLowerCase();
    return [...known.values()].filter((person) => {
      if (!needle) return true;
      return `${person.name} ${person.email} ${person.role}`.toLowerCase().includes(needle);
    });
  }, [people, shifts, query]);

  const weekShifts = shifts.filter((shift) => {
    const start = new Date(shift.start);
    return !Number.isNaN(start.getTime()) && start >= cursor && start < addDays(weekEnd, 1);
  });

  function openDraft(personId: string, day: Date) {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(day);
    end.setHours(17, 0, 0, 0);
    setUserId(personId);
    setShiftType('regular');
    setStartTime(localInput(start));
    setEndTime(localInput(end));
    setOpen(true);
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await runModule('scheduling', {
      userId,
      startTime,
      endTime,
      shiftType,
      notes: String(form.get('notes') ?? ''),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Shift published');
    setOpen(false);
    reload();
  }

  if (loading && !state) return <TableSkeleton rows={7} />;
  if (state && !state.ok) {
    return <EmptyState title="Scheduling is unavailable" body={state.error} action={<Button onClick={reload}>Try again</Button>} />;
  }

  const range = `${days[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Operations"
        title="Scheduling"
        description={state?.ok ? state.blurb : 'Shifts for this company.'}
        actions={(
          <Button onClick={() => openDraft(people[0]?.id ?? '', days[0])} disabled={people.length === 0}>
            Publish shift
          </Button>
        )}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="People" value={people.length} hint="Visible on this roster" />
        <Metric label="This week" value={weekShifts.length} hint={range} />
        <Metric label="Travel" value={weekShifts.filter((shift) => shift.shiftType === 'travel').length} hint="Travel shifts in view" />
      </div>
      <Callout title="Rules first" body="AI roster fill is not implemented. Managers publish regular and travel shifts by hand." />
      <DataToolbar query={query} onQuery={setQuery} placeholder="Search people">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Previous week" onClick={() => setCursor((value) => addDays(value, -7))}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfWeek(new Date()))}>This week</Button>
          <p className="font-numeric min-w-28 px-1 text-center text-xs text-muted-foreground">{range}</p>
          <Button variant="outline" size="icon-sm" aria-label="Next week" onClick={() => setCursor((value) => addDays(value, 7))}>
            <ChevronRight />
          </Button>
        </div>
      </DataToolbar>
      {visiblePeople.length === 0 ? (
        <EmptyState title="No one to schedule" body="Invite people from Staff, then publish their shifts here." />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">
          <div className="overflow-x-auto">
            <div className="min-w-[880px]">
              <div className="grid grid-cols-[200px_repeat(7,minmax(96px,1fr))] border-b bg-muted/40">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Person</div>
                {days.map((day) => {
                  const today = sameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className={today ? 'bg-primary/8 px-2 py-2' : 'px-2 py-2'}>
                      <p className="text-[11px] text-muted-foreground">{day.toLocaleDateString('en', { weekday: 'short' })}</p>
                      <p className="font-numeric text-sm font-medium">{day.getDate()}</p>
                    </div>
                  );
                })}
              </div>
              {visiblePeople.map((person) => (
                <div key={person.id} className="grid grid-cols-[200px_repeat(7,minmax(96px,1fr))] border-b last:border-0">
                  <div className="px-3 py-3">
                    <PersonCell name={person.name} detail={person.role} />
                  </div>
                  {days.map((day) => {
                    const dayShifts = weekShifts.filter((shift) => shift.userId === person.id && sameDay(new Date(shift.start), day));
                    const today = sameDay(day, new Date());
                    return (
                      <button
                        key={`${person.id}-${day.toISOString()}`}
                        type="button"
                        onClick={() => openDraft(person.id, day)}
                        className={`flex min-h-20 flex-col gap-1 px-1.5 py-1.5 text-left transition-colors hover:bg-muted/60 ${today ? 'bg-primary/5' : ''}`}
                        aria-label={`Add or edit ${person.name} on ${day.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}`}
                      >
                        {dayShifts.map((shift) => (
                          <span
                            key={shift.id}
                            className={`block rounded-md px-1.5 py-1 ring-1 ${shift.shiftType === 'travel' ? 'bg-amber-500/10 text-amber-950 ring-amber-500/20 dark:text-amber-100' : 'bg-primary/10 text-primary ring-primary/15'}`}
                          >
                            <span className="font-numeric block text-[11px] leading-tight">{clock(shift.start)}–{clock(shift.end)}</span>
                            <span className="mt-0.5 flex items-center justify-between gap-1">
                              <StatusBadge value={shift.shiftType} />
                            </span>
                          </span>
                        ))}
                        {dayShifts.length === 0 ? <span className="text-[11px] text-muted-foreground/70">Open</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {weekShifts.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{weekShifts.length} published</span>
          <button type="button" className="underline-offset-4 hover:underline" onClick={() => void copyText(weekShifts.map((shift) => `${shift.userId} ${formatWhen(shift.start)}`).join('\n'), 'Week copied')}>
            Copy week
          </button>
        </div>
      ) : null}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Publish shift</SheetTitle>
            <SheetDescription>Managers and admins can publish. The shift stays inside this company.</SheetDescription>
          </SheetHeader>
          <form onSubmit={publish} className="flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label>Person</Label>
              <Select value={userId} onValueChange={(value) => setUserId(value ?? '')}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose a person" /></SelectTrigger>
                <SelectContent>
                  {people.map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start</Label>
                <Input id="startTime" type="datetime-local" required value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End</Label>
                <Input id="endTime" type="datetime-local" required value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Shift type</Label>
              <Select value={shiftType} onValueChange={(value) => setShiftType(value ?? 'regular')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Optional" />
            </div>
            <SheetFooter className="px-0">
              <Button type="submit" disabled={pending || !userId}>{pending ? 'Publishing…' : 'Publish shift'}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
