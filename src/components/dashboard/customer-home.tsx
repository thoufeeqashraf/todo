'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

import { EmptyState } from '@/components/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type SparkPoint = { day: string; count: number };
export type StatusPoint = { status: string; count: number };
export type DueTask = { id: string; title: string; due: string | null; status: string; priority: string };
export type ActivityItem = { id: string; title: string; at: string };
export type TeamMember = { id: string; name: string; role: string; seen: boolean };

const actions = [
  { href: '/customer/tasks', title: 'Tasks', body: 'Assign work and track deadlines.', icon: ClipboardList },
  { href: '/customer/staff', title: 'Staff', body: 'People, departments, and invite links.', icon: Users },
  { href: '/customer/scheduling', title: 'Scheduling', body: 'Shifts. AI roster fill is not built.', icon: CalendarDays },
  { href: '/customer/module/incidents', title: 'Incidents', body: 'Tickets inside this company.', icon: Shield },
  { href: '/customer/module/attendance', title: 'Attendance', body: 'Geofence clock-in and travel days.', icon: MapPin },
  { href: '/customer/reports', title: 'Reports', body: 'Task counts for this company.', icon: Receipt },
  { href: '/customer/module/wallet', title: 'Wallet', body: 'Ledger only. Top-up does not move money.', icon: Wallet },
  { href: '/customer/module/pos', title: 'POS', body: 'Orders stay unpaid until a provider exists.', icon: Store },
  { href: '/customer/module/health', title: 'Staff health', body: 'Provisional rules score for managers.', icon: HeartPulse },
  { href: '/customer/module/find', title: 'Find My Staff', body: 'Consented coordinates. No map tiles.', icon: MapPin },
  { href: '/customer/module/cctv', title: 'CCTV', body: 'Camera names. No live stream.', icon: Video },
  { href: '/customer/module/notifications', title: 'Notifications', body: 'In-app notices. Email is not sent.', icon: Bell },
  { href: '/customer/module/mini-apps', title: 'Mini-apps', body: 'Marketplace shell. No partners connected.', icon: Sparkles },
];

function Spark({ data }: { data: SparkPoint[] }) {
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Area type="monotone" dataKey="count" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.18} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CustomerHome({
  firstName,
  companyName,
  industry,
  region,
  role,
  modulesOn,
  openTasks,
  dueSoon,
  people,
  sparkline,
  statuses,
  due,
  activity,
  team,
  showTeam,
}: {
  firstName: string;
  companyName: string;
  industry: string;
  region: string;
  role: string;
  modulesOn: number;
  openTasks: number;
  dueSoon: number;
  people: number | null;
  sparkline: SparkPoint[];
  statuses: StatusPoint[];
  due: DueTask[];
  activity: ActivityItem[];
  team: TeamMember[];
  showTeam: boolean;
}) {
  const stats = [
    { label: 'Open tasks', value: String(openTasks), hint: 'Tasks created, last 7 days', series: sparkline },
    { label: 'Due in 7 days', value: String(dueSoon), hint: 'Open tasks with a date this week', series: sparkline },
    { label: 'People', value: people === null ? '—' : String(people), hint: 'Active people. The line is task creates.', series: sparkline },
    { label: 'Modules on', value: String(modulesOn), hint: industry || 'Company', series: sparkline },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{companyName}</p>
          <h1>Hello, {firstName}</h1>
          <p className="text-sm text-muted-foreground">
            Region <span className="font-numeric">{region.toUpperCase()}</span>
          </p>
        </div>
        <Badge variant="secondary" className="capitalize">{role}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="font-numeric text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Spark data={stat.series} />
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Tasks by status</CardTitle>
            <CardDescription>Counts you are allowed to see. Floor staff do not see the whole company.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {statuses.length === 0 ? (
              <EmptyState title="No tasks yet" body="Create a task and the status chart will fill in." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statuses} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} width={28} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)' }}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--popover-foreground)' }}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>{role === 'user' ? 'Your notices.' : 'Latest audit rows for this company.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState title="Nothing recorded yet" body="Actions in this company will show up here." />
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{item.title}</span>
                    <span className="font-numeric shrink-0 text-xs text-muted-foreground">{item.at}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Tasks due</CardTitle>
            <CardDescription>Open work with a due date, soonest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {due.length === 0 ? (
              <EmptyState title="Nothing due" body="Open tasks without a date stay off this list." />
            ) : (
              <ul className="space-y-3">
                {due.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">{task.status.replaceAll('_', ' ')}</p>
                    </div>
                    <Badge variant="outline" className="font-numeric">{task.due ? new Date(task.due).toLocaleDateString() : '—'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>A seen mark means a consented location in the last day. It is not a live map.</CardDescription>
          </CardHeader>
          <CardContent>
            {!showTeam ? (
              <EmptyState title="Managers see the roster" body="Your own tasks stay on this dashboard. The people list is for managers and admins." />
            ) : team.length === 0 ? (
              <EmptyState title="No people yet" body="The first admin is created at signup." />
            ) : (
              <ul className="space-y-3">
                {team.map((member) => (
                  <li key={member.id} className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{member.role}</p>
                    </div>
                    <Badge variant={member.seen ? 'default' : 'secondary'}>{member.seen ? 'Seen' : 'No location'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((item) => (
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
          {role === 'admin' && (
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
    </div>
  );
}
