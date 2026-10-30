import { redirect } from 'next/navigation';

import { ConfigNotice } from '@/components/config-notice';
import { CustomerHome, type ActivityItem, type DueTask, type TeamMember } from '@/components/dashboard/customer-home';
import { formatStamp, homeFeedPlan, taskSparkline, taskStatusSeries } from '@/lib/customer-home-summary';
import { getCustomerSession } from '@/lib/customer-session';
import { enabledModuleNames } from '@/lib/services/tenant';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

export const instant = false;

type TaskRow = { id: string; title: string; status: string | null; priority: string; due_date: string | null; created_at: string | null };
type UserRow = { id: string; first_name: string | null; last_name: string | null; role: string };
type AuditRow = { id: string; action: string; created_at: string };
type NoteRow = { id: string; title: string; created_at: string };
type LocationRow = { user_id: string; recorded_at: string };

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

  const companyId = session.companyId;
  const role = session.user.role;
  const seeCompany = role === 'admin' || role === 'manager';

  let companyName = 'Company';
  let industry = '';
  let region = 'za';
  let modulesOn = 0;
  let tasks: TaskRow[] = [];
  let users: UserRow[] = [];
  let activity: ActivityItem[] = [];
  let locations: LocationRow[] = [];
  let unavailable = false;

  try {
    const plan = homeFeedPlan(await enabledModuleNames(companyId), role);
    const empty = Promise.resolve({ data: [] as unknown[], error: null });
    let taskQuery = supabaseAdmin
      .from('tasks')
      .select('id, title, status, priority, due_date, created_at')
      .eq('company_id', companyId);
    if (!seeCompany) {
      taskQuery = taskQuery.or(`assigned_to_id.eq.${session.user.id},assigned_by_id.eq.${session.user.id}`);
    }
    const [companyResult, moduleResult, taskResult, userResult, activityResult, locationResult] = await Promise.all([
      supabaseAdmin.from('companies').select('name, region, industries(display_name)').eq('id', companyId).maybeSingle(),
      supabaseAdmin.from('company_modules').select('id').eq('company_id', companyId).eq('is_enabled', true),
      plan.tasks ? taskQuery : empty,
      plan.team
        ? supabaseAdmin.from('users').select('id, first_name, last_name, role').eq('company_id', companyId).eq('is_active', true).order('created_at')
        : empty,
      plan.audit
        ? supabaseAdmin.from('audit_logs').select('id, action, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(6)
        : plan.notifications
          ? supabaseAdmin.from('notifications').select('id, title, created_at').eq('company_id', companyId).eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(6)
          : empty,
      plan.locations
        ? supabaseAdmin.from('staff_locations').select('user_id, recorded_at').eq('company_id', companyId).order('recorded_at', { ascending: false }).limit(40)
        : empty,
    ]);
    if (companyResult.error || moduleResult.error) {
      unavailable = true;
    } else {
      const row = companyResult.data as { name?: string; region?: string; industries?: { display_name?: string } | { display_name?: string }[] | null } | null;
      const industries = row?.industries;
      companyName = row?.name || companyName;
      region = row?.region || region;
      industry = Array.isArray(industries) ? industries[0]?.display_name || '' : industries?.display_name || '';
      modulesOn = moduleResult.data?.length ?? 0;
      if (!taskResult.error) tasks = (taskResult.data ?? []) as TaskRow[];
      if (!userResult.error) users = (userResult.data ?? []) as UserRow[];
      if (!activityResult.error) {
        activity = seeCompany
          ? ((activityResult.data ?? []) as AuditRow[]).map((item) => ({
              id: item.id,
              title: item.action,
              at: formatStamp(item.created_at),
            }))
          : ((activityResult.data ?? []) as NoteRow[]).map((item) => ({
              id: item.id,
              title: item.title,
              at: formatStamp(item.created_at),
            }));
      }
      if (!locationResult.error) locations = (locationResult.data ?? []) as LocationRow[];
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

  const open = tasks.filter((task) => task.status !== 'completed');
  const weekAhead = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const dueSoon = open.filter((task) => task.due_date && new Date(task.due_date).getTime() <= weekAhead).length;
  const statuses = taskStatusSeries(tasks.map((task) => task.status));
  const due: DueTask[] = open
    .filter((task) => task.due_date)
    .sort((a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime())
    .slice(0, 5)
    .map((task) => ({ id: task.id, title: task.title, due: task.due_date, status: task.status ?? 'unknown', priority: task.priority }));
  const seenCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const seen = new Set(locations.filter((row) => new Date(row.recorded_at).getTime() >= seenCutoff).map((row) => row.user_id));
  const team: TeamMember[] = users.slice(0, 8).map((user) => ({
    id: user.id,
    name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Teammate',
    role: user.role,
    seen: seen.has(user.id),
  }));

  return (
    <CustomerHome
      firstName={session.user.first_name || 'there'}
      companyName={companyName}
      industry={industry}
      region={region}
      role={role}
      modulesOn={modulesOn}
      openTasks={open.length}
      dueSoon={dueSoon}
      people={seeCompany ? users.length : null}
      sparkline={taskSparkline(tasks.map((task) => task.created_at))}
      statuses={statuses}
      due={due}
      activity={activity}
      team={team}
      showTeam={seeCompany}
    />
  );
}
