import 'server-only';

import { redirect } from 'next/navigation';

import { buildSnapshot, type AttendanceRow, type IncidentRow, type TaskRow } from '@/components/analytics/aggregate';
import { resolveRange, todayUtc } from '@/components/analytics/range';
import type { AnalyticsLoad } from '@/components/analytics/view';
import { getCustomerSession } from '@/lib/customer-session';
import { PlatformError } from '@/lib/platform-error';
import { canSeeCompanyTasks } from '@/lib/platform-rules';
import { assertModule, type TenantActor } from '@/lib/services/tenant';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

const ROW_CAP = 5000;

type AttendanceRecord = AttendanceRow & { id: string };

type QueryError = { message: string; code?: string; details?: string; hint?: string } | null;

function failed(error: QueryError, label: string): boolean {
  if (!error) return false;
  console.error(label, {
    code: error.code ?? null,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
  return true;
}

function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function displayName(first: string | null, last: string | null): string {
  const name = `${first ?? ''} ${last ?? ''}`.trim();
  return name || 'Unnamed staff';
}

export async function loadAnalytics(input: { from?: string; to?: string }): Promise<AnalyticsLoad> {
  const session = await getCustomerSession();
  if (!session) redirect('/customer-login');

  if (!isSupabaseConfigured()) return { state: 'unconfigured' };

  const actor: TenantActor = {
    userId: session.user.id,
    companyId: session.companyId,
    role: session.user.role,
    email: session.user.email,
  };

  try {
    await assertModule(actor, 'reports');
  } catch (error) {
    if (error instanceof PlatformError && error.code === 'module_disabled') {
      return { state: 'gated', message: error.message };
    }
    if (error instanceof PlatformError && error.code === 'not_configured') {
      return { state: 'unconfigured' };
    }
    console.error(error);
    return { state: 'error', message: 'Analytics could not be loaded.' };
  }

  const now = new Date();
  const range = resolveRange({ from: input.from, to: input.to, now });
  const fromIso = `${range.previousFrom}T00:00:00.000Z`;
  const toIso = `${range.to}T23:59:59.999Z`;
  const companyWide = canSeeCompanyTasks(actor.role);

  let tasksQuery = supabaseAdmin
    .from('tasks')
    .select('id, title, status, due_date, assigned_to_id, created_at, completed_at')
    .eq('company_id', actor.companyId)
    .lte('created_at', toIso)
    .limit(ROW_CAP);
  let incidentsQuery = supabaseAdmin
    .from('incidents')
    .select('status, created_at')
    .eq('company_id', actor.companyId)
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .limit(ROW_CAP);
  let usersQuery = supabaseAdmin
    .from('users')
    .select('id, first_name, last_name')
    .eq('company_id', actor.companyId)
    .limit(ROW_CAP);

  const attendanceCreated = () => {
    let query = supabaseAdmin
      .from('attendance')
      .select('id, user_id, status, clock_in, created_at')
      .eq('company_id', actor.companyId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .limit(ROW_CAP);
    if (!companyWide) query = query.eq('user_id', actor.userId);
    return query;
  };
  const attendanceClocked = () => {
    let query = supabaseAdmin
      .from('attendance')
      .select('id, user_id, status, clock_in, created_at')
      .eq('company_id', actor.companyId)
      .gte('clock_in', fromIso)
      .lte('clock_in', toIso)
      .limit(ROW_CAP);
    if (!companyWide) query = query.eq('user_id', actor.userId);
    return query;
  };

  if (!companyWide) {
    tasksQuery = tasksQuery.eq('assigned_to_id', actor.userId);
    incidentsQuery = incidentsQuery.eq('reported_by', actor.userId);
    usersQuery = usersQuery.eq('id', actor.userId);
  }

  const [tasksResult, incidentsResult, usersResult, createdAttendance, clockedAttendance] = await Promise.all([
    tasksQuery,
    incidentsQuery,
    usersQuery,
    attendanceCreated(),
    attendanceClocked(),
  ]);

  if (
    failed(tasksResult.error, 'Could not read tasks for analytics.')
    || failed(incidentsResult.error, 'Could not read incidents for analytics.')
    || failed(usersResult.error, 'Could not read staff for analytics.')
    || failed(createdAttendance.error, 'Could not read attendance for analytics.')
    || failed(clockedAttendance.error, 'Could not read clock-ins for analytics.')
  ) {
    return { state: 'error', message: 'Analytics could not be loaded. Try again in a moment.' };
  }

  const attendanceById = new Map<string, AttendanceRecord>();
  for (const row of [...rows<AttendanceRecord>(createdAttendance.data), ...rows<AttendanceRecord>(clockedAttendance.data)]) {
    attendanceById.set(row.id, row);
  }

  const people = rows<{ id: string; first_name: string | null; last_name: string | null }>(usersResult.data).map((user) => ({
    id: user.id,
    name: displayName(user.first_name, user.last_name),
  }));

  const truncated = [tasksResult.data, incidentsResult.data, createdAttendance.data, clockedAttendance.data].some(
    (batch) => Array.isArray(batch) && batch.length >= ROW_CAP,
  );

  return {
    state: 'ready',
    today: todayUtc(now),
    snapshot: buildSnapshot({
      range,
      scope: companyWide ? 'company' : 'own',
      tasks: rows<TaskRow>(tasksResult.data),
      attendance: [...attendanceById.values()],
      incidents: rows<IncidentRow>(incidentsResult.data),
      people,
      truncated,
    }),
  };
}
