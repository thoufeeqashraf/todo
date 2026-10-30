'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Factory, LayoutDashboard, Layers, Plus } from 'lucide-react';

import { logoutCustomer } from '@/app/customer/actions';
import { LogoMark } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
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

const items = [
  { href: '/owner', label: 'Overview', icon: LayoutDashboard },
  { href: '/owner/tenants', label: 'Businesses', icon: Building2 },
  { href: '/owner/tenants/new', label: 'New business', icon: Plus },
  { href: '/owner/industries', label: 'Industries', icon: Factory },
  { href: '/owner/modules', label: 'Modules', icon: Layers },
];

function active(pathname: string, href: string) {
  if (href === '/owner') return pathname === '/owner';
  if (href === '/owner/tenants') {
    return pathname === '/owner/tenants' || (pathname.startsWith('/owner/tenants/') && !pathname.startsWith('/owner/tenants/new'));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OwnerShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="gap-3 px-3 py-3">
          <Link href="/owner" className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
            <LogoMark className="size-8 shrink-0" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold tracking-tight">ToDo App</p>
              <p className="truncate text-xs text-muted-foreground">Platform Owner</p>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Vendor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={active(pathname, item.href)} tooltip={item.label} render={<Link href={item.href} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-2 p-2">
          <Button variant="outline" size="sm" className="justify-start group-data-[collapsible=icon]:hidden" render={<Link href="/customer" />}>
            Company console
          </Button>
          <p className="truncate px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">{email}</p>
          <form action={logoutCustomer}>
            <button type="submit" className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden">
              Sign out
            </button>
          </form>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="app-canvas min-h-svh">
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 sm:px-4">
          <SidebarTrigger />
          <p className="text-sm font-medium tracking-tight">Platform Owner</p>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
