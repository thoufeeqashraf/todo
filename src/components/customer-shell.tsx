'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  Receipt,
  Search,
  Settings,
  Shield,
  Sparkles,
  Store,
  Users,
  Video,
  Wallet,
  Waypoints,
} from 'lucide-react';

import { logoutCustomer } from '@/app/customer/actions';
import { LogoMark } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; admin?: boolean };

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Work',
    items: [
      { href: '/customer', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/customer/tasks', label: 'Tasks', icon: ClipboardList },
      { href: '/customer/incidents', label: 'Incidents', icon: Shield },
      { href: '/customer/scheduling', label: 'Scheduling', icon: CalendarDays },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/customer/staff', label: 'Staff', icon: Users },
      { href: '/customer/attendance', label: 'Attendance', icon: Waypoints },
      { href: '/customer/health', label: 'Staff health', icon: HeartPulse },
      { href: '/customer/find-my-staff', label: 'Find My Staff', icon: MapPin },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/customer/wallet', label: 'Wallet', icon: Wallet },
      { href: '/customer/pos', label: 'POS', icon: Store },
      { href: '/customer/reports', label: 'Reports', icon: Receipt },
      { href: '/customer/module/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/customer/modules', label: 'Modules', icon: Sparkles, admin: true },
      { href: '/customer/team', label: 'Team', icon: Users, admin: true },
      { href: '/customer/billing', label: 'Billing', icon: CreditCard, admin: true },
      { href: '/customer/module/onboarding', label: 'Onboarding', icon: Building2 },
      { href: '/customer/cctv', label: 'CCTV', icon: Video },
      { href: '/customer/module/mini-apps', label: 'Mini-apps', icon: Sparkles },
      { href: '/customer/audit', label: 'Audit log', icon: Shield, admin: true },
      { href: '/customer/settings', label: 'Settings', icon: Settings, admin: true },
    ],
  },
];

function initials(name: string, email: string) {
  const source = name || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function CustomerShell({
  children,
  companyName,
  industry,
  email,
  role,
  name,
  unread = 0,
}: {
  children: React.ReactNode;
  companyName: string;
  industry: string;
  email: string;
  role: string;
  name: string;
  unread?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const items = groups.flatMap((group) => group.items).filter((item) => !item.admin || role === 'admin');
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => !needle || item.label.toLowerCase().includes(needle));
  }, [items, query]);
  const current = items.find((item) => item.href !== '/customer' && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
  const crumbs = current
    ? [{ href: '/customer', label: 'Dashboard' }, { href: current.href, label: current.label }]
    : [{ href: '/customer', label: 'Dashboard' }];

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
        <SidebarHeader className="gap-3 px-3 py-3">
          <Link href="/customer" className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
            <LogoMark className="size-8 shrink-0" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold tracking-tight">ToDo App</p>
              <p className="truncate text-xs text-muted-foreground">Operations</p>
            </div>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg bg-sidebar-accent/80 px-2 py-2 text-left outline-none ring-sidebar-ring group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent focus-visible:ring-2">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{companyName}</span>
                <span className="block truncate text-xs text-muted-foreground">{industry || 'Company'}</span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Organisation</DropdownMenuLabel>
              <DropdownMenuItem disabled>{companyName}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/customer-login" />}>
                Sign in to another company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <SidebarFooter className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center">
              <Avatar size="sm">
                <AvatarFallback>{initials(name, email)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-sm font-medium">{name || email}</span>
                <span className="block truncate text-xs capitalize text-muted-foreground">{role}</span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel>
                <span className="block truncate">{name || email}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="capitalize">{role}</DropdownMenuItem>
              {role === 'admin' ? (
                <DropdownMenuItem render={<Link href="/customer/settings" />}>Settings</DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <form action={logoutCustomer}>
                <button type="submit" className="flex w-full rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted">
                  Sign out
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="app-canvas min-h-svh">
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 sm:px-4">
          <SidebarTrigger />
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm sm:flex">
            {crumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex min-w-0 items-center gap-1">
                {index > 0 ? <ChevronRight className="size-3.5 text-muted-foreground" /> : null}
                <Link href={crumb.href} className={index === crumbs.length - 1 ? 'truncate font-medium' : 'truncate text-muted-foreground hover:text-foreground'}>
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => setOpen(true)}>
              <Search />
              <span className="text-muted-foreground">Search</span>
              <kbd className="font-numeric rounded-md border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </Button>
            <Button type="button" variant="ghost" size="icon" className="sm:hidden" onClick={() => setOpen(true)} aria-label="Search">
              <Search />
            </Button>
            <Button variant="ghost" size="icon" className="relative" render={<Link href="/customer/module/notifications" />} aria-label="Notifications">
              <Bell />
              {unread > 0 ? <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1">{unread > 9 ? '9+' : unread}</Badge> : null}
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
            <DialogDescription>Pages in this company. A module still has to be turned on.</DialogDescription>
          </DialogHeader>
          <Input autoFocus placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
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
