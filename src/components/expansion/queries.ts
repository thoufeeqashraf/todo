import 'server-only';

import { getCustomerSession } from '@/lib/customer-session';
import { PlatformError } from '@/lib/platform-error';
import { canManagePeople, canSeeCompanyTasks } from '@/lib/platform-rules';
import { assertModule, listNotifications, type TenantActor } from '@/lib/services/tenant';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

import {
  asInboxType,
  asPriority,
  asTaskColumn,
  isUuid,
  parseClientDirectory,
  type ClientsSnapshot,
  type InboxItem,
  type ProjectSnapshot,
  type ProjectTask,
} from './model';

export type ExpansionState<T> =
  | { state: 'ready'; data: T }
  | { state: 'signed_out' }
  | { state: 'unconfigured' }
  | { state: 'disabled'; message: string }
  | { state: 'error'; message: string };

function toActor(session: NonNullable<Awaited<ReturnType<typeof getCustomerSession>>>): TenantActor {
  return {
    userId: session.user.id,
    companyId: session.companyId,
    role: session.user.role,
    email: session.user.email,
  };
}

function settle<T>(error: unknown, fallback: string): ExpansionState<T> {
  if (error instanceof PlatformError) {
    if (error.code === 'module_disabled') return { state: 'disabled', message: error.message };
    if (error.code === 'not_configured') return { state: 'unconfigured' };
    return { state: 'error', message: error.message };
  }
  console.error(error);
  return { state: 'error', message: fallback };
}

async function sessionOrState(): Promise<
  | { ok: true; actor: TenantActor }
  | { ok: false; result: ExpansionState<never> }
> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, result: { state: 'signed_out' } };
  if (!isSupabaseConfigured()) return { ok: false, result: { state: 'unconfigured' } };
  if (!isUuid(session.user.id) || !isUuid(session.companyId)) {
    return { ok: false, result: { state: 'error', message: 'This session is not valid.' } };
  }
  return { ok: true, actor: toActor(session) };
}

export async function loadProjects(): Promise<ExpansionState<ProjectSnapshot>> {
  const gate = await sessionOrState();
  if (!gate.ok) return gate.result;
  try {
    await assertModule(gate.actor, 'projects');
    let taskQuery = supabaseAdmin
      .from('tasks')
      .select('id, title, description, status, priority, due_date, department_id, assigned_to_id, created_at')
      .eq('company_id', gate.actor.companyId)
      .order('created_at', { ascending: false });
    if (!canSeeCompanyTasks(gate.actor.role)) {
      taskQuery = taskQuery.or(
        `assigned_to_id.eq.${gate.actor.userId},assigned_by_id.eq.${gate.actor.userId}`,
      );
    }
    const tasksResult = await taskQuery;
    if (tasksResult.error) {
      console.error('Could not list project tasks.', tasksResult.error);
      return { state: 'error', message: 'Could not load projects.' };
    }

    const taskRows = (tasksResult.data ?? []) as Record<string, unknown>[];
    const assigneeIds = [
      ...new Set(
        taskRows
          .map((row) => (typeof row.assigned_to_id === 'string' ? row.assigned_to_id : ''))
          .filter((id) => isUuid(id)),
      ),
    ];

    const [departmentsResult, peopleResult] = await Promise.all([
      supabaseAdmin
        .from('departments')
        .select('id, name')
        .eq('company_id', gate.actor.companyId)
        .order('name'),
      assigneeIds.length > 0
        ? supabaseAdmin
            .from('users')
            .select('id, first_name, last_name')
            .eq('company_id', gate.actor.companyId)
            .in('id', assigneeIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (departmentsResult.error || peopleResult.error) {
      console.error('Could not load project context.', departmentsResult.error ?? peopleResult.error);
      return { state: 'error', message: 'Could not load projects.' };
    }

    const departmentName = new Map<string, string>();
    for (const row of (departmentsResult.data ?? []) as Record<string, unknown>[]) {
      if (typeof row.id === 'string' && typeof row.name === 'string') departmentName.set(row.id, row.name);
    }
    const people = new Map<string, string>();
    for (const row of (peopleResult.data ?? []) as Record<string, unknown>[]) {
      if (typeof row.id !== 'string') continue;
      const name = `${typeof row.first_name === 'string' ? row.first_name : ''} ${typeof row.last_name === 'string' ? row.last_name : ''}`.trim();
      people.set(row.id, name || 'Unnamed');
    }

    const tasks: ProjectTask[] = taskRows.flatMap((row) => {
      if (typeof row.id !== 'string' || typeof row.title !== 'string') return [];
      const departmentId = typeof row.department_id === 'string' ? row.department_id : null;
      const assigneeId = typeof row.assigned_to_id === 'string' ? row.assigned_to_id : null;
      return [
        {
          id: row.id,
          title: row.title,
          description: typeof row.description === 'string' ? row.description : null,
          status: asTaskColumn(row.status),
          priority: asPriority(row.priority),
          dueDate: typeof row.due_date === 'string' ? row.due_date : null,
          createdAt: typeof row.created_at === 'string' ? row.created_at : '',
          departmentId,
          departmentName: departmentId ? departmentName.get(departmentId) ?? 'Project' : 'No project',
          assigneeName: assigneeId ? people.get(assigneeId) ?? null : null,
        },
      ];
    });

    const projects = [...departmentName.entries()]
      .map(([id, name]) => ({ id, name }))
      .filter((project) => canSeeCompanyTasks(gate.actor.role) || tasks.some((task) => task.departmentId === project.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { state: 'ready', data: { tasks, projects } };
  } catch (error) {
    return settle(error, 'Could not load projects.');
  }
}

async function clientsModuleId(companyId: string) {
  const moduleResult = await supabaseAdmin.from('modules').select('id').eq('name', 'clients').maybeSingle();
  if (moduleResult.error || !moduleResult.data || typeof moduleResult.data !== 'object') {
    throw new PlatformError('database', 'Could not read the clients module.', 500);
  }
  const moduleId = (moduleResult.data as { id?: unknown }).id;
  if (typeof moduleId !== 'string' || !isUuid(moduleId)) {
    throw new PlatformError('database', 'Could not read the clients module.', 500);
  }
  const row = await supabaseAdmin
    .from('company_modules')
    .select('settings')
    .eq('company_id', companyId)
    .eq('module_id', moduleId)
    .eq('is_enabled', true)
    .maybeSingle();
  if (row.error) throw new PlatformError('database', 'Could not read clients.', 500);
  return { moduleId, settings: (row.data as { settings?: unknown } | null)?.settings ?? {} };
}

export async function readClients(actor: TenantActor): Promise<ClientsSnapshot> {
  await assertModule(actor, 'clients');
  const { settings } = await clientsModuleId(actor.companyId);
  const stored =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as { clients?: unknown }).clients
      : undefined;
  return {
    clients: parseClientDirectory(stored),
    canManage: canManagePeople(actor.role),
  };
}

export async function loadClients(): Promise<ExpansionState<ClientsSnapshot>> {
  const gate = await sessionOrState();
  if (!gate.ok) return gate.result;
  try {
    return { state: 'ready', data: await readClients(gate.actor) };
  } catch (error) {
    return settle(error, 'Could not load clients.');
  }
}

export async function loadInbox(): Promise<ExpansionState<InboxItem[]>> {
  const gate = await sessionOrState();
  if (!gate.ok) return gate.result;
  try {
    const rows = await listNotifications(gate.actor);
    const items: InboxItem[] = (rows as Record<string, unknown>[]).flatMap((row) => {
      if (typeof row.id !== 'string' || typeof row.title !== 'string') return [];
      const link = typeof row.link === 'string' ? row.link : null;
      return [
        {
          id: row.id,
          title: row.title,
          message: typeof row.message === 'string' ? row.message : '',
          type: asInboxType(row.type),
          link,
          read: row.read === true,
          createdAt: typeof row.created_at === 'string' ? row.created_at : '',
        },
      ];
    });
    return { state: 'ready', data: items };
  } catch (error) {
    return settle(error, 'Could not load notifications.');
  }
}

export { clientsModuleId };
