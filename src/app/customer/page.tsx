import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  MapPin,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Store,
  Users,
  Video,
  Wallet,
} from 'lucide-react';

import { ConfigNotice } from '@/components/config-notice';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomerSession } from '@/lib/customer-session';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

export const instant = false;

const destinations = [
  { href: '/customer/tasks', title: 'Tasks', body: 'Assign work and track deadlines.', icon: ClipboardList },
  { href: '/customer/module/staff', title: 'Staff', body: 'People, departments, and invite links.', icon: Users },
  { href: '/customer/module/scheduling', title: 'Scheduling', body: 'Shifts. AI roster fill is not built.', icon: CalendarDays },
  { href: '/customer/module/incidents', title: 'Incidents', body: 'Tickets inside this company.', icon: Shield },
  { href: '/customer/module/attendance', title: 'Attendance', body: 'Geofence clock-in and travel days.', icon: MapPin },
  { href: '/customer/module/reports', title: 'Reports', body: 'Task counts for this company.', icon: Receipt },
  { href: '/customer/module/wallet', title: 'Wallet', body: 'Ledger only. Top-up does not move money.', icon: Wallet },
  { href: '/customer/module/pos', title: 'POS', body: 'Orders stay unpaid until a provider exists.', icon: Store },
  { href: '/customer/module/health', title: 'Staff health', body: 'Provisional rules score for managers.', icon: HeartPulse },
  { href: '/customer/module/find', title: 'Find My Staff', body: 'Consented coordinates. No map tiles.', icon: MapPin },
  { href: '/customer/module/cctv', title: 'CCTV', body: 'Camera names. No live stream.', icon: Video },
  { href: '/customer/module/notifications', title: 'Notifications', body: 'In-app notices. Email is not sent.', icon: Bell },
  { href: '/customer/module/mini-apps', title: 'Mini-apps', body: 'Marketplace shell. No partners connected.', icon: Sparkles },
];

export default async function CustomerDashboardPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/customer-login');

  if (!isSupabaseConfigured()) {
    return (
      <ConfigNotice
        title="Database is not configured"
        body="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003."
      />
    );
  }

  let company: unknown = null;
  let enabledCount = 0;
  let unavailable = false;
  try {
    const companyResult = await supabaseAdmin
      .from('companies')
      .select('name, region, industries(display_name)')
      .eq('id', session.companyId)
      .maybeSingle();
    const moduleResult = await supabaseAdmin
      .from('company_modules')
      .select('id')
      .eq('company_id', session.companyId)
      .eq('is_enabled', true);
    if (companyResult.error || moduleResult.error) {
      unavailable = true;
    } else {
      company = companyResult.data;
      enabledCount = moduleResult.data?.length ?? 0;
    }
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <ConfigNotice
        title="Company data is unavailable"
        body="The database did not return this company. Apply migrations 001–003 and confirm the service role key."
      />
    );
  }

  const row = company as { name?: string; region?: string; industries?: { display_name?: string } | { display_name?: string }[] | null } | null;
  const industries = row?.industries;
  const industry = Array.isArray(industries) ? industries[0]?.display_name : industries?.display_name;
  const firstName = session.user.first_name || 'there';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{industry || 'Company'}</p>
          <h1>Hello, {firstName}</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {row?.name || 'Your company'} · region <span className="font-numeric">{(row?.region || 'za').toUpperCase()}</span>
          </p>
        </div>
        <Badge variant="secondary" className="capitalize">{session.user.role}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardDescription>Modules on</CardDescription>
            <CardTitle className="font-numeric text-3xl">{enabledCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardDescription>Role</CardDescription>
            <CardTitle className="capitalize">{session.user.role}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardDescription>Next setup</CardDescription>
            <CardTitle>Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/customer/module/onboarding" className="text-sm text-primary">Open checklist</Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="h-full bg-card/75 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardHeader>
                <item.icon className="size-4 text-primary" />
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.body}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {session.user.role === 'admin' && (
          <Link href="/customer/modules" className="group">
            <Card className="h-full bg-card/75 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardHeader>
                <Settings className="size-4 text-primary" />
                <CardTitle>Modules</CardTitle>
                <CardDescription>Turn features on or off.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
