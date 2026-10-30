'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { markInboxRead, markInboxReadMany } from './actions';
import { filterInbox, formatDateTime, safeInternalPath, type InboxItem, type InboxType } from './model';

const typeVariant: Record<InboxType, 'secondary' | 'outline' | 'default' | 'destructive'> = {
  info: 'secondary',
  success: 'outline',
  warning: 'default',
  error: 'destructive',
};

export function NotificationsInbox({ items }: { items: InboxItem[] }) {
  const [rows, setRows] = useState(items);
  const [scope, setScope] = useState<'all' | 'unread' | 'read'>('all');
  const [type, setType] = useState<'all' | InboxType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => filterInbox(rows, scope, type), [rows, scope, type]);
  const selected = rows.find((item) => item.id === selectedId) ?? null;
  const unread = rows.filter((item) => !item.read).length;
  const visibleUnread = visible.filter((item) => !item.read);

  function markOne(id: string) {
    startTransition(async () => {
      const result = await markInboxRead(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRows((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    });
  }

  function markVisible() {
    startTransition(async () => {
      const result = await markInboxReadMany(visibleUnread.map((item) => item.id));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const done = new Set(result.ids);
      setRows((current) => current.map((item) => (done.has(item.id) ? { ...item, read: true } : item)));
      toast.success('Marked as read');
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1>Notifications</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Notices for you in this company. Email and push are not connected.
          </p>
        </div>
        <div className="rounded-xl bg-card/80 px-4 py-3 shadow-sm ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">Unread</p>
          <p className="font-numeric text-2xl">{unread}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={scope} onValueChange={(value) => setScope((value as typeof scope | null) ?? 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={(value) => setType((value as typeof type | null) ?? 'all')}>
            <SelectTrigger className="w-36" aria-label="Notification type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={pending || visibleUnread.length === 0} onClick={markVisible}>
            Mark visible read
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? 'Inbox is empty' : 'Nothing in this filter'}
          body={
            rows.length === 0
              ? 'Notices appear here when the notifications module is on and something is assigned to you.'
              : 'Choose another filter to see the rest of the inbox.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left shadow-sm ring-1 transition-colors ${
                  item.read
                    ? 'bg-card/70 ring-foreground/10 hover:ring-foreground/20'
                    : 'bg-primary/5 ring-primary/25 hover:ring-primary/40'
                }`}
              >
                <span
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.read ? 'bg-transparent' : 'bg-primary'}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={item.read ? 'font-medium text-muted-foreground' : 'font-medium'}>{item.title}</span>
                    <Badge variant={typeVariant[item.type]} className="capitalize">{item.type}</Badge>
                    {!item.read ? <span className="text-[11px] text-primary">Unread</span> : null}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{item.message}</span>
                </span>
                <span className="font-numeric shrink-0 text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent className="sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription className="font-numeric">{formatDateTime(selected.createdAt)}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-wrap gap-2 px-4">
                <Badge variant={typeVariant[selected.type]} className="capitalize">{selected.type}</Badge>
                <Badge variant={selected.read ? 'outline' : 'default'}>{selected.read ? 'Read' : 'Unread'}</Badge>
              </div>
              <p className="px-4 text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              <div className="mt-auto flex flex-wrap gap-2 px-4 pb-4">
                {!selected.read ? (
                  <Button disabled={pending} onClick={() => markOne(selected.id)}>Mark read</Button>
                ) : null}
                {safeInternalPath(selected.link) ? (
                  <Button variant="outline" render={<Link href={safeInternalPath(selected.link) ?? '/customer'} />}>
                    Open
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
