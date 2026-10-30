'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Store,
  Users,
  Video,
  Wallet,
  Waypoints,
} from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { logoutCustomer } from '@/app/customer/actions';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; admin?: boolean };

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Work',
    items: [
      { href: '/customer', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/customer/tasks', label: 'Tasks', icon: ClipboardList },
      { href: '/customer/module/incidents', label: 'Incidents', icon: Shield },
      { href: '/customer/module/scheduling', label: 'Scheduling', icon: CalendarDays },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/customer/module/staff', label: 'Staff', icon: Users },
      { href: '/customer/module/attendance', label: 'Attendance', icon: Waypoints },
      { href: '/customer/module/health', label: 'Staff health', icon: HeartPulse },
      { href: '/customer/module/find', label: 'Find My Staff', icon: MapPin },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/customer/module/wallet', label: 'Wallet', icon: Wallet },
      { href: '/customer/module/pos', label: 'POS', icon: Store },
      { href: '/customer/module/reports', label: 'Reports', icon: Receipt },
      { href: '/customer/module/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/customer/modules', label: 'Modules', icon: Sparkles, admin: true },
      { href: '/customer/module/onboarding', label: 'Onboarding', icon: Building2 },
      { href: '/customer/module/cctv', label: 'CCTV', icon: Video },
      { href: '/customer/module/mini-apps', label: 'Mini-apps', icon: Sparkles },
      { href: '/customer/module/audit', label: 'Audit log', icon: Shield, admin: true },
      { href: '/customer/module/settings', label: 'Settings', icon: Settings, admin: true },
    ],
  },
];

export function CustomerShell({
  children,
  companyName,
  industry,
  email,
  role,
  name,
}: {
  children: React.ReactNode;
  companyName: string;
  industry: string;
  email: string;
  role: string;
  name: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const items = groups.flatMap((group) => group.items).filter((item) => !item.admin || role === 'admin');
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(needle));
  }, [items, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="gap-3 px-3 py-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              W
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{companyName}</p>
              <p className="truncate text-xs text-muted-foreground">{industry || 'Operations'}</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {groups.map((group) => {
            const visible = group.items.filter((item) => !item.admin || role === 'admin');
            if (visible.length === 0) return null;
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visible.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={pathname === item.href}
                          tooltip={item.label}
                          render={<Link href={item.href} />}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
        <SidebarFooter className="gap-3 p-3">
          <div className="rounded-xl bg-sidebar-accent/70 px-3 py-2 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">{name || email}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <Badge variant="secondary" className="mt-2 capitalize">{role}</Badge>
          </div>
          <form action={logoutCustomer}>
            <Button type="submit" variant="outline" className="w-full" size="sm">
              Sign out
            </Button>
          </form>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="app-canvas min-h-svh">
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <p className="hidden text-sm text-muted-foreground sm:block">{companyName}</p>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
              <span className="text-muted-foreground">Search</span>
              <kbd className="font-numeric rounded-md border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </SidebarInset>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-3 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Jump to</DialogTitle>
            <DialogDescription>Pages in this company. Modules still have to be enabled.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="max-h-72 space-y-1 overflow-auto">
            {results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matching page.</p>
            ) : (
              results.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  {item.label}
                </Link>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
