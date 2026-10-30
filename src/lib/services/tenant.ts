import { randomBytes } from 'node:crypto';

import { hashPassword } from '@/lib/auth-utils';
import { loginAllowed } from '@/lib/owner/model';
import { PlatformError } from '@/lib/platform-error';
import {
  API_VERSION,
  API_V1_CATALOG,
  PROVIDERS,
  cameraStream,
  canAssignToOthers,
  canManagePeople,
  canSeeCompanyTasks,
  canToggleModules,
  canViewAudit,
  canViewStaffHealth,
  decideClockIn,
  industryLabels,
  isUserRole,
  ledgerBalanceCents,
  mapProviderStatus,
  moduleEnabled,
  staffHealthScore,
  transactionJunctionTopUp,
  type UserRole,
} from '@/lib/platform-rules';
import { pageResult, type PageQuery, type PageResult } from '@/lib/pagination';
import { bearerStillValid, hashToken, isBearerTokenShape, isForeignCompany, taskVisibilityFilter } from '@/lib/request-guards';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import {
  assertModuleEnabled,
  canReadIncident,
  canReadSchedule,
  canReadTask,
  companyOrOwn,
  scopedCompanyId,
  staffEditDecision,
  taskDeleteDecision,
  taskUpdateDecision,
  walletReadUserId,
} from '@/lib/tenant-scope';

export interface TenantActor {
  userId: string;
  companyId: string;
  role: UserRole;
  email: string;
}

type Row = Record<string, unknown>;

function requireConfigured() {
  if (!isSupabaseConfigured()) {
    throw new PlatformError(
      'not_configured',
      'Supabase is not configured. Add the project URL and service role key, then apply supabase/migrations.',
      503,
    );
  }
}

function fail(error: { message: string; code?: string; details?: string; hint?: string } | null, message: string): void {
  if (!error) return;
  console.error(message, {
    code: error.code ?? null,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
  throw new PlatformError('database', message, 500);
}

export async function enabledModuleNames(companyId: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('company_modules')
    .select('is_enabled, module_id')
    .eq('company_id', companyId)
    .eq('is_enabled', true);
  fail(error, 'Could not read company modules.');
  const ids = (data ?? []).map((row) => String((row as Row).module_id));
  if (ids.length === 0) return new Set();
  const modules = await supabaseAdmin.from('modules').select('id, name').in('id', ids);
  fail(modules.error, 'Could not read module catalogue.');
  return new Set((modules.data ?? []).map((row) => String((row as Row).name)));
}

export async function assertModule(actor: TenantActor, name: string) {
  requireConfigured();
  const enabled = await enabledModuleNames(actor.companyId);
  assertModuleEnabled(enabled, name);
  return enabled;
}

export async function writeAudit(
  actor: TenantActor | { companyId: string; userId: string | null },
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, unknown>,
) {
  requireConfigured();
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    company_id: actor.companyId,
    user_id: actor.userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
  });
  fail(error, 'Could not write the audit log.');
}

async function notify(companyId: string, userId: string, title: string, message: string, link?: string) {
  const enabled = await enabledModuleNames(companyId);
  if (!moduleEnabled(enabled, 'notifications')) return;
  const { error } = await supabaseAdmin.from('notifications').insert({
    company_id: companyId,
    user_id: userId,
    title,
    message,
    link: link ?? null,
    type: 'info',
  });
  fail(error, 'Could not write a notification.');
}

export async function buildBootstrap(actor: TenantActor) {
  requireConfigured();
  const companyResult = await supabaseAdmin
    .from('companies')
    .select('id, name, slug, region, industry_id, settings')
    .eq('id', actor.companyId)
    .single();
  fail(companyResult.error, 'Could not read the company.');
  const company = companyResult.data as Row;
  let industry: Row | null = null;
  if (company.industry_id) {
    const industryResult = await supabaseAdmin
      .from('industries')
      .select('id, name, display_name, description')
      .eq('id', company.industry_id)
      .maybeSingle();
    fail(industryResult.error, 'Could not read the industry.');
    industry = (industryResult.data as Row | null) ?? null;
  }
  const catalogue = await supabaseAdmin.from('modules').select('name, display_name, category, description').order('category');
  fail(catalogue.error, 'Could not read modules.');
  const enabled = await enabledModuleNames(actor.companyId);
  const industryName = industry ? String(industry.name) : null;
  return {
    apiVersion: API_VERSION,
    generatedAt: new Date().toISOString(),
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      region: company.region,
      settings: company.settings,
    },
    industry: industry
      ? {
          id: industry.id,
          name: industry.name,
          displayName: industry.display_name,
          description: industry.description,
          labels: industryLabels(industryName),
        }
      : null,
    user: { id: actor.userId, email: actor.email, role: actor.role },
    modules: (catalogue.data ?? []).map((row) => {
      const item = row as Row;
      const name = String(item.name);
      return {
        name,
        displayName: item.display_name,
        category: item.category,
        description: item.description,
        enabled: enabled.has(name),
      };
    }),
    providers: {
      payments: PROVIDERS.payments,
      maps: mapProviderStatus(),
      cctv: PROVIDERS.cctv,
      email: PROVIDERS.email,
    },
    routes: API_V1_CATALOG,
    partial: {
      hierarchy: 'Three roles are enforced. A ten-level department tree is stored, and full visibility middleware is not finished.',
      staffHealth: 'Rules score with provisional weights. Not an AI model.',
      proof: 'Task comments and media storage are not finished.',
    },
  };
}

export async function issueToken(userId: string, companyId: string) {
  requireConfigured();
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from('api_tokens').insert({
    company_id: companyId,
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: expires,
  });
  fail(error, 'Could not issue an API token.');
  return { token, tokenType: 'Bearer', expiresAt: expires };
}

export async function actorFromToken(rawToken: string): Promise<TenantActor> {
  if (!isBearerTokenShape(rawToken)) {
    throw new PlatformError('unauthorized', 'Bearer token is missing or expired.', 401);
  }
  requireConfigured();
  const { data, error } = await supabaseAdmin
    .from('api_tokens')
    .select('user_id, company_id, expires_at')
    .eq('token_hash', hashToken(rawToken))
    .maybeSingle();
  fail(error, 'Could not read the API token.');
  const tokenRow = data as Row | null;
  if (!tokenRow || !bearerStillValid(tokenRow.expires_at)) {
    throw new PlatformError('unauthorized', 'Bearer token is missing or expired.', 401);
  }
  const userResult = await supabaseAdmin
    .from('users')
    .select('id, email, role, company_id, is_active')
    .eq('id', tokenRow.user_id)
    .eq('company_id', tokenRow.company_id)
    .maybeSingle();
  fail(userResult.error, 'Could not read the token user.');
  const user = userResult.data as Row | null;
  const role = user ? String(user.role) : '';
  if (!user || user.is_active !== true || !isUserRole(role)) {
    throw new PlatformError('unauthorized', 'Bearer token is missing or expired.', 401);
  }
  const companyResult = await supabaseAdmin
    .from('companies')
    .select('slug, settings')
    .eq('id', user.company_id)
    .maybeSingle();
  fail(companyResult.error, 'Could not read the company.');
  const company = companyResult.data as Row | null;
  const slug = company?.slug ? String(company.slug) : null;
  if (!slug || !loginAllowed({ email: String(user.email), role, companySlug: slug }, company?.settings)) {
    throw new PlatformError(
      slug ? 'forbidden' : 'unauthorized',
      slug ? 'This business is suspended.' : 'Bearer token is missing or expired.',
      slug ? 403 : 401,
    );
  }
  return {
    userId: String(user.id),
    companyId: String(user.company_id),
    role,
    email: String(user.email),
  };
}

function companyRecord(value: unknown): Row | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === 'object' ? (first as Row) : null;
  }
  if (value && typeof value === 'object') return value as Row;
  return null;
}

export async function loginWithPassword(email: string, password: string, companySlug?: string) {
  requireConfigured();
  const { verifyPassword } = await import('@/lib/auth-utils');
  const normalized = email.toLowerCase();
  const joined = await supabaseAdmin
    .from('users')
    .select('id, email, password_hash, role, company_id, is_active, companies!users_company_id_fkey!inner(id, slug, name, settings)')
    .eq('email', normalized)
    .eq('is_active', true);

  let rows: Row[] = (joined.data ?? []) as Row[];
  if (joined.error) {
    console.error('loginWithPassword company join failed', {
      code: joined.error.code,
      message: joined.error.message,
      details: joined.error.details,
      hint: joined.error.hint,
    });
    const plain = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, role, company_id, is_active')
      .eq('email', normalized)
      .eq('is_active', true);
    if (plain.error) {
      console.error('loginWithPassword user lookup failed', {
        code: plain.error.code,
        message: plain.error.message,
        details: plain.error.details,
        hint: plain.error.hint,
      });
      fail(plain.error, 'Could not look up the user.');
    }
    const companyIds = [...new Set((plain.data ?? []).map((row) => String((row as Row).company_id)))];
    const companies = companyIds.length
      ? await supabaseAdmin.from('companies').select('id, slug, name, settings').in('id', companyIds)
      : { data: [] as Row[], error: null };
    if (companies.error) {
      console.error('loginWithPassword company lookup failed', {
        code: companies.error.code,
        message: companies.error.message,
        details: companies.error.details,
        hint: companies.error.hint,
      });
      fail(companies.error, 'Could not look up the user.');
    }
    const byId = new Map((companies.data ?? []).map((company) => [String((company as Row).id), company as Row]));
    rows = (plain.data ?? []).map((row) => {
      const user = row as Row;
      return { ...user, companies: byId.get(String(user.company_id)) ?? null };
    });
  }

  const matches: {
    id: string;
    companyId: string;
    slug: string;
    name: string;
    email: string;
    role: string;
    settings: unknown;
  }[] = [];
  for (const user of rows) {
    const company = companyRecord(user.companies);
    if (!company?.slug || !company.name) continue;
    const hash = typeof user.password_hash === 'string' ? user.password_hash : '';
    if (!hash.startsWith('$2')) continue;
    let valid = false;
    try {
      valid = await verifyPassword(password, hash);
    } catch {
      continue;
    }
    if (!valid) continue;
    matches.push({
      id: String(user.id),
      companyId: String(user.company_id),
      slug: String(company.slug),
      name: String(company.name),
      email: String(user.email),
      role: String(user.role),
      settings: company.settings,
    });
  }
  if (matches.length === 0) {
    throw new PlatformError('unauthorized', 'Invalid credentials.', 401);
  }
  const open = (item: (typeof matches)[number]) =>
    loginAllowed({ email: item.email, role: item.role, companySlug: item.slug }, item.settings);
  let picked: (typeof matches)[number] | undefined;
  if (companySlug) {
    const requested = matches.filter((item) => item.slug === companySlug);
    if (requested.length !== 1) {
      throw new PlatformError('company_required', 'Choose the company for this email.', 409, {
        companies: matches.filter(open).map((item) => ({ slug: item.slug, name: item.name })),
      });
    }
    if (!open(requested[0])) {
      throw new PlatformError('forbidden', 'This business is suspended.', 403);
    }
    picked = requested[0];
  } else {
    const available = matches.filter(open);
    if (available.length === 0) {
      throw new PlatformError('forbidden', 'This business is suspended.', 403);
    }
    if (available.length !== 1) {
      throw new PlatformError('company_required', 'Choose the company for this email.', 409, {
        companies: available.map((item) => ({ slug: item.slug, name: item.name })),
      });
    }
    picked = available[0];
  }
  const session = await issueToken(picked.id, picked.companyId);
  await writeAudit(
    { userId: picked.id, companyId: picked.companyId },
    'auth.token_issued',
    'user',
    picked.id,
    {},
  );
  return session;
}

function taskQuery(actor: TenantActor, status?: string) {
  const scope = companyOrOwn(actor, canSeeCompanyTasks(actor.role));
  let query = supabaseAdmin
    .from('tasks')
    .select('id, title, description, status, priority, due_date, assigned_to_id, assigned_by_id, created_at')
    .eq('company_id', scope.companyId)
    .order('created_at', { ascending: false });
  if (scope.ownUserId) {
    query = query.or(taskVisibilityFilter(scope.ownUserId));
  }
  if (status) query = query.eq('status', status);
  return query;
}

export async function listTasks(actor: TenantActor) {
  await assertModule(actor, 'tasks');
  const { data, error } = await taskQuery(actor);
  fail(error, 'Could not list tasks.');
  return data ?? [];
}

export async function listTasksPage(actor: TenantActor, page: PageQuery, status?: string): Promise<PageResult<Row>> {
  await assertModule(actor, 'tasks');
  const { data, error } = await taskQuery(actor, status).range(page.offset, page.offset + page.limit);
  fail(error, 'Could not list tasks.');
  return pageResult((data ?? []) as Row[], page);
}

export async function createTask(
  actor: TenantActor,
  input: {
    title: string;
    description?: string;
    assignedToId?: string | null;
    dueDate?: string | null;
    priority?: string;
  },
) {
  await assertModule(actor, 'tasks');
  if (input.assignedToId && input.assignedToId !== actor.userId && !canAssignToOthers(actor.role)) {
    throw new PlatformError('forbidden', 'Floor staff can only keep tasks on their own list.', 403);
  }
  if (input.assignedToId) {
    await assertSameCompanyUser(actor.companyId, input.assignedToId);
  }
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      company_id: actor.companyId,
      title: input.title,
      description: input.description ?? null,
      assigned_to_id: input.assignedToId ?? null,
      assigned_by_id: actor.userId,
      due_date: input.dueDate || null,
      priority: input.priority ?? 'medium',
      status: 'todo',
    })
    .select('id, title, status, priority, assigned_to_id')
    .single();
  fail(error, 'Could not create the task.');
  const task = requireRow(data, 'Could not create the task.');
  await writeAudit(actor, 'task.created', 'task', String(task.id), { title: input.title });
  if (input.assignedToId) {
    await notify(actor.companyId, input.assignedToId, 'New task', input.title, '/customer/tasks');
  }
  return task;
}

export async function assertSameCompanyUser(companyId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, company_id')
    .eq('company_id', companyId)
    .eq('id', userId)
    .maybeSingle();
  fail(error, 'Could not check the user.');
  if (!data || isForeignCompany(companyId, (data as Row).company_id)) {
    throw new PlatformError('not_found', 'That person is not in this company.', 404);
  }
}

export async function assertSameCompanyDepartment(companyId: string, departmentId: string) {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, company_id')
    .eq('company_id', companyId)
    .eq('id', departmentId)
    .maybeSingle();
  fail(error, 'Could not check the department.');
  if (!data || isForeignCompany(companyId, (data as Row).company_id)) {
    throw new PlatformError('not_found', 'That department is not in this company.', 404);
  }
}

export async function listUsers(actor: TenantActor) {
  await assertModule(actor, 'staff');
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, role, is_active, created_at')
    .eq('company_id', actor.companyId)
    .order('created_at');
  fail(error, 'Could not list staff.');
  return data ?? [];
}

export async function listDepartments(actor: TenantActor) {
  await assertModule(actor, 'staff');
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, parent_id, manager_id')
    .eq('company_id', actor.companyId)
    .order('name');
  fail(error, 'Could not list departments.');
  return data ?? [];
}

export async function createDepartment(actor: TenantActor, name: string, parentId?: string | null) {
  await assertModule(actor, 'staff');
  if (!canManagePeople(actor.role)) {
    throw new PlatformError('forbidden', 'Only a manager or admin can add a department.', 403);
  }
  if (parentId) await assertSameCompanyDepartment(actor.companyId, parentId);
  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert({ company_id: actor.companyId, name, parent_id: parentId || null })
    .select('id, name, parent_id')
    .single();
  fail(error, 'Could not create the department.');
  await writeAudit(actor, 'department.created', 'department', String((data as Row).id), { name });
  return data;
}

export async function createInvitation(actor: TenantActor, email: string, role: UserRole) {
  await assertModule(actor, 'staff');
  if (!canManagePeople(actor.role)) {
    throw new PlatformError('forbidden', 'Only a manager or admin can invite people.', 403);
  }
  if (role === 'admin' && actor.role !== 'admin') {
    throw new PlatformError('forbidden', 'Only an admin can invite another admin.', 403);
  }
  const raw = randomBytes(24).toString('base64url');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .insert({
      company_id: actor.companyId,
      email: email.toLowerCase(),
      role,
      invited_by_id: actor.userId,
      token: hashToken(raw),
      expires_at: expires,
      status: 'pending',
    })
    .select('id, email, role, expires_at, status')
    .single();
  fail(error, 'Could not create the invitation.');
  await writeAudit(actor, 'invitation.created', 'invitation', String((data as Row).id), { email, role });
  return {
    invitation: data,
    invitePath: `/invite/${raw}`,
    emailSent: false,
    provider: PROVIDERS.email,
  };
}

export async function acceptInvitation(input: {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  requireConfigured();
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('id, company_id, email, role, expires_at, status')
    .eq('token', hashToken(input.token))
    .maybeSingle();
  fail(error, 'Could not read the invitation.');
  const invite = data as Row | null;
  if (!invite || invite.status !== 'pending') {
    throw new PlatformError('not_found', 'This invitation is not available.', 404);
  }
  const expiresMs = new Date(typeof invite.expires_at === 'string' || typeof invite.expires_at === 'number' ? invite.expires_at : '').getTime();
  if (!Number.isFinite(expiresMs) || expiresMs < Date.now()) {
    throw new PlatformError('expired', 'This invitation has expired.', 410);
  }
  if (!isUserRole(String(invite.role))) {
    throw new PlatformError('invalid', 'Invitation role is not valid.', 400);
  }
  assertModuleEnabled(await enabledModuleNames(String(invite.company_id)), 'staff');
  const passwordHash = await hashPassword(input.password);
  const created = await supabaseAdmin
    .from('users')
    .insert({
      company_id: invite.company_id,
      email: invite.email,
      password_hash: passwordHash,
      first_name: input.firstName,
      last_name: input.lastName,
      role: invite.role,
    })
    .select('id, email, role, company_id')
    .single();
  fail(created.error, 'Could not create the invited user.');
  const user = requireRow(created.data, 'Could not create the invited user.');
  const accepted = await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id)
    .eq('company_id', invite.company_id);
  fail(accepted.error, 'Could not accept the invitation.');
  await writeAudit(
    { userId: String(user.id), companyId: String(user.company_id) },
    'invitation.accepted',
    'user',
    String(user.id),
    {},
  );
  return { id: user.id, email: user.email, role: user.role };
}

export async function listNotifications(actor: TenantActor) {
  await assertModule(actor, 'notifications');
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id, title, message, type, link, read, created_at')
    .eq('company_id', actor.companyId)
    .eq('user_id', actor.userId)
    .order('created_at', { ascending: false })
    .limit(50);
  fail(error, 'Could not list notifications.');
  return data ?? [];
}

export async function markNotificationRead(actor: TenantActor, id: string) {
  await assertModule(actor, 'notifications');
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('company_id', actor.companyId)
    .eq('user_id', actor.userId);
  fail(error, 'Could not update the notification.');
  return { ok: true };
}

export async function listAudit(actor: TenantActor) {
  requireConfigured();
  if (!canViewAudit(actor.role)) {
    throw new PlatformError('forbidden', 'Only an admin can read the audit log.', 403);
  }
  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select('id, user_id, action, entity_type, entity_id, changes, created_at')
    .eq('company_id', actor.companyId)
    .order('created_at', { ascending: false })
    .limit(100);
  fail(error, 'Could not read the audit log.');
  return data ?? [];
}

export async function listIncidents(actor: TenantActor) {
  await assertModule(actor, 'incidents');
  let query = supabaseAdmin
    .from('incidents')
    .select('id, title, description, status, location_label, reported_by, assigned_to, created_at')
    .eq('company_id', actor.companyId)
    .order('created_at', { ascending: false });
  if (!canSeeCompanyTasks(actor.role)) query = query.eq('reported_by', actor.userId);
  const { data, error } = await query;
  fail(error, 'Could not list incidents.');
  return data ?? [];
}

export async function createIncident(
  actor: TenantActor,
  input: { title: string; description?: string; locationLabel?: string },
) {
  await assertModule(actor, 'incidents');
  const { data, error } = await supabaseAdmin
    .from('incidents')
    .insert({
      company_id: actor.companyId,
      title: input.title,
      description: input.description ?? null,
      location_label: input.locationLabel ?? null,
      reported_by: actor.userId,
      status: 'open',
    })
    .select('id, title, status')
    .single();
  fail(error, 'Could not create the incident.');
  await writeAudit(actor, 'incident.created', 'incident', String((data as Row).id), { title: input.title });
  return data;
}

export async function listSchedules(actor: TenantActor) {
  await assertModule(actor, 'scheduling');
  let query = supabaseAdmin
    .from('schedules')
    .select('id, user_id, start_time, end_time, shift_type, status, notes')
    .eq('company_id', actor.companyId)
    .order('start_time');
  if (!canSeeCompanyTasks(actor.role)) query = query.eq('user_id', actor.userId);
  const { data, error } = await query;
  fail(error, 'Could not list schedules.');
  return data ?? [];
}

export async function createSchedule(
  actor: TenantActor,
  input: { userId: string; startTime: string; endTime: string; shiftType?: string; notes?: string },
) {
  await assertModule(actor, 'scheduling');
  if (!canManagePeople(actor.role)) {
    throw new PlatformError('forbidden', 'Only a manager or admin can publish a shift.', 403);
  }
  await assertSameCompanyUser(actor.companyId, input.userId);
  assertShiftWindow(input.startTime, input.endTime);
  const { data, error } = await supabaseAdmin
    .from('schedules')
    .insert({
      company_id: actor.companyId,
      user_id: input.userId,
      start_time: input.startTime,
      end_time: input.endTime,
      shift_type: input.shiftType ?? 'regular',
      notes: input.notes ?? null,
      status: 'scheduled',
    })
    .select('id, user_id, start_time, end_time, shift_type, status')
    .single();
  fail(error, 'Could not create the shift.');
  await writeAudit(actor, 'schedule.created', 'schedule', String((data as Row).id), {});
  await notify(actor.companyId, input.userId, 'Shift published', `${input.startTime} to ${input.endTime}`, '/customer/module/scheduling');
  return data;
}

export async function saveGeofence(
  actor: TenantActor,
  input: { name: string; lat: number; lng: number; radiusMeters: number },
) {
  await assertModule(actor, 'geofence_attendance');
  if (!canToggleModules(actor.role)) {
    throw new PlatformError('forbidden', 'Only an admin can set the company geofence.', 403);
  }
  const { data, error } = await supabaseAdmin
    .from('geofences')
    .insert({
      company_id: actor.companyId,
      name: input.name,
      latitude: input.lat,
      longitude: input.lng,
      radius_meters: input.radiusMeters,
      active: true,
    })
    .select('id, name, latitude, longitude, radius_meters')
    .single();
  fail(error, 'Could not save the geofence.');
  await writeAudit(actor, 'geofence.saved', 'geofence', String((data as Row).id), {});
  return data;
}

export async function grantTravelDay(actor: TenantActor, input: { userId: string; workDate: string; reason: string }) {
  await assertModule(actor, 'geofence_attendance');
  if (!canManagePeople(actor.role)) {
    throw new PlatformError('forbidden', 'Only a manager or admin can pre-approve a travel day.', 403);
  }
  await assertSameCompanyUser(actor.companyId, input.userId);
  const { data, error } = await supabaseAdmin
    .from('travel_exceptions')
    .insert({
      company_id: actor.companyId,
      user_id: input.userId,
      work_date: input.workDate,
      reason: input.reason,
      approved_by: actor.userId,
    })
    .select('id, user_id, work_date')
    .single();
  fail(error, 'Could not save the travel day.');
  await writeAudit(actor, 'attendance.travel_day', 'travel_exception', String((data as Row).id), {});
  return data;
}

export async function clockIn(actor: TenantActor, input: { lat?: number; lng?: number }) {
  await assertModule(actor, 'geofence_attendance');
  const today = new Date().toISOString().slice(0, 10);
  const [fenceResult, travelResult, shiftResult] = await Promise.all([
    supabaseAdmin
      .from('geofences')
      .select('latitude, longitude, radius_meters')
      .eq('company_id', actor.companyId)
      .eq('active', true)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('travel_exceptions')
      .select('id')
      .eq('company_id', actor.companyId)
      .eq('user_id', actor.userId)
      .eq('work_date', today)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('schedules')
      .select('id')
      .eq('company_id', actor.companyId)
      .eq('user_id', actor.userId)
      .eq('shift_type', 'travel')
      .lte('start_time', new Date().toISOString())
      .gte('end_time', new Date().toISOString())
      .limit(1)
      .maybeSingle(),
  ]);
  fail(fenceResult.error, 'Could not read the geofence.');
  fail(travelResult.error, 'Could not read travel days.');
  fail(shiftResult.error, 'Could not read travel shifts.');
  const fenceRow = fenceResult.data as Row | null;
  const decision = decideClockIn({
    point: input.lat === undefined || input.lng === undefined ? null : { lat: input.lat, lng: input.lng },
    fence: fenceRow
      ? {
          lat: Number(fenceRow.latitude),
          lng: Number(fenceRow.longitude),
          radiusMeters: Number(fenceRow.radius_meters),
        }
      : null,
    travelDay: Boolean(shiftResult.data),
    manualApproved: Boolean(travelResult.data),
  });
  await writeAudit(actor, decision.allowed ? 'attendance.clock_in' : 'attendance.clock_in_refused', 'attendance', null, {
    reason: decision.reason,
    distanceMeters: decision.distanceMeters,
  });
  if (!decision.allowed) return { ...decision, map: mapProviderStatus(), attendance: null };
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .insert({
      company_id: actor.companyId,
      user_id: actor.userId,
      clock_in: new Date().toISOString(),
      clock_in_location:
        input.lat === undefined ? null : { lat: input.lat, lng: input.lng, provider: 'device_coordinates' },
      status: 'clocked_in',
      notes: decision.reason,
    })
    .select('id, status, clock_in')
    .single();
  fail(error, 'Could not record clock-in.');
  return { ...decision, map: mapProviderStatus(), attendance: data };
}

export async function staffHealth(actor: TenantActor, userId?: string) {
  await assertModule(actor, 'staff_health');
  if (!canViewStaffHealth(actor.role)) {
    throw new PlatformError('forbidden', 'Staff health is visible only to managers and admins.', 403);
  }
  let query = supabaseAdmin
    .from('staff_health_events')
    .select('user_id, kind')
    .eq('company_id', actor.companyId);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  fail(error, 'Could not read staff health.');
  const buckets = new Map<string, { misses: number; late: number; proofRejected: number; completed: number }>();
  for (const row of data ?? []) {
    const item = row as Row;
    const id = String(item.user_id);
    const bucket = buckets.get(id) ?? { misses: 0, late: 0, proofRejected: 0, completed: 0 };
    if (item.kind === 'miss') bucket.misses += 1;
    if (item.kind === 'late') bucket.late += 1;
    if (item.kind === 'proof_rejected') bucket.proofRejected += 1;
    if (item.kind === 'complete') bucket.completed += 1;
    buckets.set(id, bucket);
  }
  return [...buckets.entries()].map(([id, counts]) => ({
    userId: id,
    ...counts,
    ...staffHealthScore(counts),
  }));
}

export async function addStaffHealthEvent(
  actor: TenantActor,
  input: { userId: string; kind: 'miss' | 'late' | 'proof_rejected' | 'complete'; note?: string },
) {
  await assertModule(actor, 'staff_health');
  if (!canViewStaffHealth(actor.role)) {
    throw new PlatformError('forbidden', 'Only a manager or admin can record a staff health event.', 403);
  }
  await assertSameCompanyUser(actor.companyId, input.userId);
  const { data, error } = await supabaseAdmin
    .from('staff_health_events')
    .insert({
      company_id: actor.companyId,
      user_id: input.userId,
      kind: input.kind,
      note: input.note ?? null,
      created_by: actor.userId,
    })
    .select('id, user_id, kind')
    .single();
  fail(error, 'Could not record the staff health event.');
  await writeAudit(actor, 'staff_health.recorded', 'staff_health_event', String((data as Row).id), { kind: input.kind });
  return data;
}

async function walletAccount(actor: TenantActor, userId: string) {
  const existing = await supabaseAdmin
    .from('wallet_accounts')
    .select('id, user_id, currency')
    .eq('company_id', actor.companyId)
    .eq('user_id', userId)
    .maybeSingle();
  fail(existing.error, 'Could not read the wallet.');
  if (existing.data) return existing.data as Row;
  const created = await supabaseAdmin
    .from('wallet_accounts')
    .insert({ company_id: actor.companyId, user_id: userId, currency: 'ZAR' })
    .select('id, user_id, currency')
    .single();
  fail(created.error, 'Could not open the wallet.');
  return created.data as Row;
}

export async function walletView(actor: TenantActor) {
  await assertModule(actor, 'wallet');
  const account = await walletAccount(actor, actor.userId);
  const entries = await supabaseAdmin
    .from('wallet_entries')
    .select('id, amount_cents, direction, source, memo, created_at')
    .eq('company_id', actor.companyId)
    .eq('account_id', account.id)
    .order('created_at', { ascending: false });
  fail(entries.error, 'Could not read wallet entries.');
  const rows = (entries.data ?? []) as Row[];
  return {
    account,
    balanceCents: ledgerBalanceCents(
      rows.map((row) => ({
        amountCents: Number(row.amount_cents),
        direction: row.direction as 'credit' | 'debit',
      })),
    ),
    entries: rows,
    topUp: transactionJunctionTopUp(),
  };
}

export async function walletAdjustment(actor: TenantActor, amountCents: number, direction: 'credit' | 'debit', memo: string) {
  await assertModule(actor, 'wallet');
  if (actor.role !== 'admin') {
    throw new PlatformError('forbidden', 'Only an admin can post a manual ledger adjustment.', 403);
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new PlatformError('invalid', 'Amount must be a positive number of cents.', 400);
  }
  const view = await walletView(actor);
  if (direction === 'debit' && view.balanceCents < amountCents) {
    throw new PlatformError('insufficient_funds', 'The ledger does not have that balance.', 409);
  }
  const { data, error } = await supabaseAdmin
    .from('wallet_entries')
    .insert({
      company_id: actor.companyId,
      account_id: view.account.id,
      amount_cents: amountCents,
      direction,
      source: 'manual_adjustment',
      memo,
      created_by: actor.userId,
    })
    .select('id, amount_cents, direction, source')
    .single();
  fail(error, 'Could not post the ledger adjustment.');
  await writeAudit(actor, 'wallet.manual_adjustment', 'wallet_entry', String((data as Row).id), {
    amountCents,
    direction,
  });
  return data;
}

export async function walletTopUp(actor: TenantActor) {
  await assertModule(actor, 'wallet');
  const stub = transactionJunctionTopUp();
  await writeAudit(actor, 'wallet.top_up_stub', 'wallet', null, { movedMoney: false });
  return stub;
}

export async function listOrders(actor: TenantActor) {
  await assertModule(actor, 'pos');
  const { data, error } = await supabaseAdmin
    .from('pos_orders')
    .select('id, table_label, status, items, total_cents, payment_status, created_at')
    .eq('company_id', actor.companyId)
    .order('created_at', { ascending: false });
  fail(error, 'Could not list orders.');
  return data ?? [];
}

export async function createOrder(
  actor: TenantActor,
  input: { tableLabel: string; items: unknown; totalCents: number },
) {
  await assertModule(actor, 'pos');
  const { data, error } = await supabaseAdmin
    .from('pos_orders')
    .insert({
      company_id: actor.companyId,
      table_label: input.tableLabel,
      items: input.items,
      total_cents: input.totalCents,
      payment_status: 'unpaid',
      status: 'open',
      created_by: actor.userId,
    })
    .select('id, table_label, payment_status, total_cents, status')
    .single();
  fail(error, 'Could not open the order.');
  await writeAudit(actor, 'pos.order_opened', 'pos_order', String((data as Row).id), {});
  return { order: data, payment: transactionJunctionTopUp() };
}

export async function listCameras(actor: TenantActor) {
  await assertModule(actor, 'cctv');
  const { data, error } = await supabaseAdmin
    .from('cameras')
    .select('id, name, site_label, provider, external_ref')
    .eq('company_id', actor.companyId)
    .order('name');
  fail(error, 'Could not list cameras.');
  return (data ?? []).map((row) => {
    const camera = row as Row;
    return { ...camera, stream: cameraStream(camera.provider ? String(camera.provider) : null) };
  });
}

export async function createCamera(actor: TenantActor, input: { name: string; siteLabel?: string }) {
  await assertModule(actor, 'cctv');
  if (!canManagePeople(actor.role)) {
    throw new PlatformError('forbidden', 'Only a manager or admin can register a camera.', 403);
  }
  const { data, error } = await supabaseAdmin
    .from('cameras')
    .insert({
      company_id: actor.companyId,
      name: input.name,
      site_label: input.siteLabel ?? null,
      provider: 'unconfigured',
    })
    .select('id, name, site_label, provider')
    .single();
  fail(error, 'Could not register the camera.');
  return { ...(data as Row), stream: cameraStream('unconfigured') };
}

export async function listMiniApps(actor: TenantActor) {
  await assertModule(actor, 'mini_apps');
  const { data, error } = await supabaseAdmin
    .from('mini_apps')
    .select('id, name, status, created_at')
    .eq('company_id', actor.companyId);
  fail(error, 'Could not list mini-apps.');
  return {
    installed: data ?? [],
    marketplace: [],
    provider: { state: 'not_connected' as const, message: 'No partner mini-app APIs are connected.' },
  };
}

export async function listLocations(actor: TenantActor) {
  await assertModule(actor, 'find_my_staff');
  let query = supabaseAdmin
    .from('staff_locations')
    .select('id, user_id, latitude, longitude, recorded_at, consent')
    .eq('company_id', actor.companyId)
    .eq('consent', true)
    .order('recorded_at', { ascending: false })
    .limit(100);
  if (!canViewStaffHealth(actor.role)) query = query.eq('user_id', actor.userId);
  const { data, error } = await query;
  fail(error, 'Could not read locations.');
  return { locations: data ?? [], map: mapProviderStatus() };
}

export async function recordLocation(
  actor: TenantActor,
  input: { lat: number; lng: number; consent: boolean },
) {
  await assertModule(actor, 'find_my_staff');
  if (input.consent !== true) {
    throw new PlatformError('consent_required', 'Location is stored only when consent is true.', 400);
  }
  const { data, error } = await supabaseAdmin
    .from('staff_locations')
    .insert({
      company_id: actor.companyId,
      user_id: actor.userId,
      latitude: input.lat,
      longitude: input.lng,
      consent: true,
      source: 'device_coordinates',
    })
    .select('id, recorded_at')
    .single();
  fail(error, 'Could not store the location.');
  return { location: data, map: mapProviderStatus() };
}

export async function reportSummary(actor: TenantActor) {
  await assertModule(actor, 'reports');
  const tasks = await supabaseAdmin.from('tasks').select('status').eq('company_id', actor.companyId);
  fail(tasks.error, 'Could not summarise tasks.');
  const counts: Record<string, number> = {};
  for (const row of tasks.data ?? []) {
    const status = String((row as Row).status);
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return { tasks: counts, generatedAt: new Date().toISOString(), partial: true };
}

export async function onboarding(actor: TenantActor) {
  requireConfigured();
  const [users, tasks, modules] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('company_id', actor.companyId),
    supabaseAdmin.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', actor.companyId),
    supabaseAdmin.from('company_modules').select('id', { count: 'exact', head: true }).eq('company_id', actor.companyId).eq('is_enabled', true),
  ]);
  const company = await supabaseAdmin.from('companies').select('industry_id, region, name').eq('id', actor.companyId).single();
  fail(company.error, 'Could not read onboarding state.');
  const row = requireRow(company.data, 'Could not read onboarding state.');
  return {
    steps: [
      { id: 'company', label: 'Company created', done: true },
      { id: 'industry', label: 'Industry selected', done: Boolean(row.industry_id) },
      { id: 'region', label: 'Region set', done: Boolean(row.region) },
      { id: 'modules', label: 'At least one module on', done: (modules.count ?? 0) > 0 },
      { id: 'people', label: 'More than the first admin', done: (users.count ?? 0) > 1 },
      { id: 'task', label: 'First task created', done: (tasks.count ?? 0) > 0 },
    ],
  };
}

export async function companySettings(actor: TenantActor) {
  requireConfigured();
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('id, name, slug, region, settings')
    .eq('id', actor.companyId)
    .single();
  fail(error, 'Could not read settings.');
  return data;
}

export async function updateCompanySettings(actor: TenantActor, input: { name?: string; region?: string }) {
  requireConfigured();
  if (!canToggleModules(actor.role)) {
    throw new PlatformError('forbidden', 'Only an admin can change company settings.', 403);
  }
  const patch: Record<string, string> = {};
  if (input.name) patch.name = input.name;
  if (input.region) {
    if (!['za', 'eu', 'multi'].includes(input.region)) {
      throw new PlatformError('invalid', 'Region must be za, eu, or multi.', 400);
    }
    patch.region = input.region;
  }
  const { data, error } = await supabaseAdmin
    .from('companies')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', actor.companyId)
    .select('id, name, slug, region')
    .single();
  fail(error, 'Could not update settings.');
  await writeAudit(actor, 'company.updated', 'company', actor.companyId, patch);
  return data;
}

function requireRow(data: unknown, message: string): Row {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new PlatformError('database', message, 500);
  }
  return data as Row;
}

function idOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function assertShiftWindow(startTime: string, endTime: string) {
  const startMs = Date.parse(startTime);
  const endMs = Date.parse(endTime);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    throw new PlatformError('invalid', 'Shift end must be after the start.', 400);
  }
}

async function pagedRows(
  query: PromiseLike<unknown>,
  page: PageQuery,
  message: string,
): Promise<PageResult<Row>> {
  const result = (await query) as { data: unknown; error: { message: string } | null };
  fail(result.error, message);
  return pageResult((Array.isArray(result.data) ? result.data : []) as Row[], page);
}

export async function getTask(actor: TenantActor, id: string) {
  await assertModule(actor, 'tasks');
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('id, title, description, status, priority, due_date, assigned_to_id, assigned_by_id, created_at, updated_at')
    .eq('company_id', scopedCompanyId(actor))
    .eq('id', id)
    .maybeSingle();
  fail(error, 'Could not read the task.');
  const task = data as Row | null;
  if (!task || !canReadTask(actor, { assigned_to_id: idOrNull(task.assigned_to_id), assigned_by_id: idOrNull(task.assigned_by_id) })) {
    throw new PlatformError('not_found', 'Task not found.', 404);
  }
  return task;
}

export async function updateTask(
  actor: TenantActor,
  id: string,
  input: {
    title?: string;
    description?: string | null;
    assignedToId?: string | null;
    dueDate?: string | null;
    priority?: string;
    status?: string;
  },
) {
  const existing = await getTask(actor, id);
  const decision = taskUpdateDecision(
    actor,
    { assigned_to_id: idOrNull(existing.assigned_to_id), assigned_by_id: idOrNull(existing.assigned_by_id) },
    input,
  );
  if (!decision.ok) throw new PlatformError(decision.code, decision.message, decision.status);
  if (input.assignedToId) await assertSameCompanyUser(actor.companyId, input.assignedToId);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.assignedToId !== undefined) patch.assigned_to_id = input.assignedToId;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completed_at = input.status === 'completed' ? new Date().toISOString() : null;
  }
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .eq('company_id', actor.companyId)
    .select('id, title, description, status, priority, due_date, assigned_to_id')
    .single();
  fail(error, 'Could not update the task.');
  const task = requireRow(data, 'Could not update the task.');
  await writeAudit(actor, 'task.updated', 'task', id, patch);
  if (input.assignedToId) {
    await notify(actor.companyId, input.assignedToId, 'Task updated', input.title ?? 'A task was assigned to you', '/customer/tasks');
  }
  return task;
}

export async function deleteTask(actor: TenantActor, id: string) {
  await getTask(actor, id);
  const decision = taskDeleteDecision(actor);
  if (!decision.ok) throw new PlatformError(decision.code, decision.message, decision.status);
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('company_id', actor.companyId)
    .select('id')
    .maybeSingle();
  fail(error, 'Could not delete the task.');
  if (!data) throw new PlatformError('not_found', 'Task not found.', 404);
  await writeAudit(actor, 'task.deleted', 'task', id, {});
  return { ok: true };
}

export async function listUsersPage(actor: TenantActor, page: PageQuery) {
  await assertModule(actor, 'staff');
  return pagedRows(
    supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, created_at')
      .eq('company_id', scopedCompanyId(actor))
      .order('created_at')
      .range(page.offset, page.offset + page.limit),
    page,
    'Could not list staff.',
  );
}

export async function getStaffMember(actor: TenantActor, id: string) {
  await assertModule(actor, 'staff');
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, role, is_active, created_at')
    .eq('company_id', scopedCompanyId(actor))
    .eq('id', id)
    .maybeSingle();
  fail(error, 'Could not read the staff member.');
  if (!data) throw new PlatformError('not_found', 'That person is not in this company.', 404);
  return data;
}

export async function updateStaffMember(
  actor: TenantActor,
  id: string,
  input: { role?: UserRole; isActive?: boolean; firstName?: string; lastName?: string },
) {
  const existing = (await getStaffMember(actor, id)) as Row;
  if (staffEditDecision(actor, { role: String(existing.role), userId: String(existing.id) }, input) !== 'ok') {
    throw new PlatformError('forbidden', 'You cannot change that staff member.', 403);
  }
  const patch: Record<string, unknown> = {};
  if (input.role) patch.role = input.role;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.firstName) patch.first_name = input.firstName;
  if (input.lastName) patch.last_name = input.lastName;
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(patch)
    .eq('id', id)
    .eq('company_id', actor.companyId)
    .select('id, email, first_name, last_name, role, is_active')
    .single();
  fail(error, 'Could not update the staff member.');
  await writeAudit(actor, 'staff.updated', 'user', id, patch);
  return data;
}

export async function listDepartmentsPage(actor: TenantActor, page: PageQuery) {
  await assertModule(actor, 'staff');
  return pagedRows(
    supabaseAdmin
      .from('departments')
      .select('id, name, parent_id, manager_id')
      .eq('company_id', scopedCompanyId(actor))
      .order('name')
      .range(page.offset, page.offset + page.limit),
    page,
    'Could not list departments.',
  );
}

export async function listNotificationsPage(actor: TenantActor, page: PageQuery, unreadOnly = false) {
  await assertModule(actor, 'notifications');
  let query = supabaseAdmin
    .from('notifications')
    .select('id, title, message, type, link, read, created_at')
    .eq('company_id', scopedCompanyId(actor))
    .eq('user_id', actor.userId)
    .order('created_at', { ascending: false });
  if (unreadOnly) query = query.eq('read', false);
  return pagedRows(query.range(page.offset, page.offset + page.limit), page, 'Could not list notifications.');
}

export async function markAllNotificationsRead(actor: TenantActor) {
  await assertModule(actor, 'notifications');
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('company_id', scopedCompanyId(actor))
    .eq('user_id', actor.userId)
    .eq('read', false);
  fail(error, 'Could not update notifications.');
  return { ok: true };
}

export async function listAuditPage(actor: TenantActor, page: PageQuery) {
  requireConfigured();
  if (!canViewAudit(actor.role)) {
    throw new PlatformError('forbidden', 'Only an admin can read the audit log.', 403);
  }
  return pagedRows(
    supabaseAdmin
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, changes, created_at')
      .eq('company_id', scopedCompanyId(actor))
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit),
    page,
    'Could not read the audit log.',
  );
}

export async function listIncidentsPage(actor: TenantActor, page: PageQuery, status?: string) {
  await assertModule(actor, 'incidents');
  const scope = companyOrOwn(actor, canSeeCompanyTasks(actor.role));
  let query = supabaseAdmin
    .from('incidents')
    .select('id, title, description, status, location_label, reported_by, assigned_to, created_at')
    .eq('company_id', scope.companyId)
    .order('created_at', { ascending: false });
  if (scope.ownUserId) query = query.eq('reported_by', scope.ownUserId);
  if (status) query = query.eq('status', status);
  return pagedRows(query.range(page.offset, page.offset + page.limit), page, 'Could not list incidents.');
}

export async function getIncident(actor: TenantActor, id: string) {
  await assertModule(actor, 'incidents');
  const { data, error } = await supabaseAdmin
    .from('incidents')
    .select('id, title, description, status, location_label, reported_by, assigned_to, created_at, updated_at')
    .eq('company_id', scopedCompanyId(actor))
    .eq('id', id)
    .maybeSingle();
  fail(error, 'Could not read the incident.');
  const incident = data as Row | null;
  if (!incident || !canReadIncident(actor, { reported_by: idOrNull(incident.reported_by) })) {
    throw new PlatformError('not_found', 'Incident not found.', 404);
  }
  return incident;
}

export async function updateIncident(
  actor: TenantActor,
  id: string,
  input: {
    title?: string;
    description?: string | null;
    locationLabel?: string | null;
    status?: string;
    assignedToId?: string | null;
  },
) {
  if (!canManagePeople(actor.role)) {
    throw new PlatformError('forbidden', 'Only a manager or admin can update an incident.', 403);
  }
  await getIncident(actor, id);
  if (input.assignedToId) await assertSameCompanyUser(actor.companyId, input.assignedToId);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.locationLabel !== undefined) patch.location_label = input.locationLabel;
  if (input.status !== undefined) patch.status = input.status;
  if (input.assignedToId !== undefined) patch.assigned_to = input.assignedToId;
  const { data, error } = await supabaseAdmin
    .from('incidents')
    .update(patch)
    .eq('id', id)
    .eq('company_id', actor.companyId)
    .select('id, title, status, assigned_to')
    .single();
  fail(error, 'Could not update the incident.');
  await writeAudit(actor, 'incident.updated', 'incident', id, patch);
  return data;
}

export async function listSchedulesPage(actor: TenantActor, page: PageQuery) {
  await assertModule(actor, 'scheduling');
  const scope = companyOrOwn(actor, canSeeCompanyTasks(actor.role));
  let query = supabaseAdmin
    .from('schedules')
    .select('id, user_id, start_time, end_time, shift_type, status, notes')
    .eq('company_id', scope.companyId)
    .order('start_time');
  if (scope.ownUserId) query = query.eq('user_id', scope.ownUserId);
  return pagedRows(query.range(page.offset, page.offset + page.limit), page, 'Could not list schedules.');
}

export async function getSchedule(actor: TenantActor, id: string) {
  await assertModule(actor, 'scheduling');
  const { data, error } = await supabaseAdmin
    .from('schedules')
    .select('id, user_id, start_time, end_time, shift_type, status, notes')
    .eq('company_id', scopedCompanyId(actor))
    .eq('id', id)
    .maybeSingle();
  fail(error, 'Could not read the shift.');
  const schedule = data as Row | null;
  if (!schedule || !canReadSchedule(actor, { user_id: String(schedule.user_id) })) {
    throw new PlatformError('not_found', 'Shift not found.', 404);
  }
  return schedule;
}

export async function updateSchedule(
  actor: TenantActor,
  id: string,
  input: { userId?: string; startTime?: string; endTime?: string; shiftType?: string; notes?: string | null; status?: string },
) {
  await assertModule(actor, 'scheduling');
  if (!canManagePeople(actor.role)) {
    throw new PlatformError('forbidden', 'Only a manager or admin can change a shift.', 403);
  }
  const existing = (await getSchedule(actor, id)) as Row;
  if (input.userId) await assertSameCompanyUser(actor.companyId, input.userId);
  const startTime = input.startTime ?? String(existing.start_time);
  const endTime = input.endTime ?? String(existing.end_time);
  assertShiftWindow(startTime, endTime);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.userId !== undefined) patch.user_id = input.userId;
  if (input.startTime !== undefined) patch.start_time = input.startTime;
  if (input.endTime !== undefined) patch.end_time = input.endTime;
  if (input.shiftType !== undefined) patch.shift_type = input.shiftType;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.status !== undefined) patch.status = input.status;
  const { data, error } = await supabaseAdmin
    .from('schedules')
    .update(patch)
    .eq('id', id)
    .eq('company_id', actor.companyId)
    .select('id, user_id, start_time, end_time, shift_type, status')
    .single();
  fail(error, 'Could not update the shift.');
  await writeAudit(actor, 'schedule.updated', 'schedule', id, {});
  return data;
}

export async function deleteSchedule(actor: TenantActor, id: string) {
  await assertModule(actor, 'scheduling');
  if (!canManagePeople(actor.role)) {
    throw new PlatformError('forbidden', 'Only a manager or admin can delete a shift.', 403);
  }
  await getSchedule(actor, id);
  const { data, error } = await supabaseAdmin
    .from('schedules')
    .delete()
    .eq('id', id)
    .eq('company_id', actor.companyId)
    .select('id')
    .maybeSingle();
  fail(error, 'Could not delete the shift.');
  if (!data) throw new PlatformError('not_found', 'Shift not found.', 404);
  await writeAudit(actor, 'schedule.deleted', 'schedule', id, {});
  return { ok: true };
}

export async function listAttendance(actor: TenantActor, page: PageQuery, userId?: string) {
  await assertModule(actor, 'geofence_attendance');
  const scope = companyOrOwn(actor, canSeeCompanyTasks(actor.role));
  let query = supabaseAdmin
    .from('attendance')
    .select('id, user_id, schedule_id, clock_in, clock_out, status, notes, created_at')
    .eq('company_id', scope.companyId)
    .order('created_at', { ascending: false });
  if (scope.ownUserId) query = query.eq('user_id', scope.ownUserId);
  else if (userId) {
    await assertSameCompanyUser(actor.companyId, userId);
    query = query.eq('user_id', userId);
  }
  return pagedRows(query.range(page.offset, page.offset + page.limit), page, 'Could not list attendance.');
}

export async function clockOut(actor: TenantActor, input: { lat?: number; lng?: number }) {
  await assertModule(actor, 'geofence_attendance');
  const open = await supabaseAdmin
    .from('attendance')
    .select('id, clock_in')
    .eq('company_id', scopedCompanyId(actor))
    .eq('user_id', actor.userId)
    .eq('status', 'clocked_in')
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();
  fail(open.error, 'Could not read attendance.');
  const openRow = open.data as Row | null;
  if (!openRow) throw new PlatformError('conflict', 'No open clock-in to close.', 409);
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .update({
      clock_out: new Date().toISOString(),
      clock_out_location:
        input.lat === undefined ? null : { lat: input.lat, lng: input.lng, provider: 'device_coordinates' },
      status: 'clocked_out',
    })
    .eq('id', openRow.id)
    .eq('company_id', actor.companyId)
    .eq('user_id', actor.userId)
    .select('id, status, clock_in, clock_out')
    .single();
  fail(error, 'Could not record clock-out.');
  await writeAudit(actor, 'attendance.clock_out', 'attendance', String(openRow.id), {});
  return data;
}

export async function listWalletEntries(actor: TenantActor, page: PageQuery, userId?: string) {
  await assertModule(actor, 'wallet');
  const target = walletReadUserId(actor, userId);
  if (target === 'forbidden') {
    throw new PlatformError('forbidden', 'You can only read your own wallet.', 403);
  }
  if (target !== actor.userId) await assertSameCompanyUser(actor.companyId, target);
  const accountResult = await supabaseAdmin
    .from('wallet_accounts')
    .select('id, user_id, currency')
    .eq('company_id', scopedCompanyId(actor))
    .eq('user_id', target)
    .maybeSingle();
  fail(accountResult.error, 'Could not read the wallet.');
  const account = accountResult.data as Row | null;
  if (!account) {
    return { account: null, balanceCents: 0, ...pageResult([], page) };
  }
  const amounts = await supabaseAdmin
    .from('wallet_entries')
    .select('amount_cents, direction')
    .eq('company_id', actor.companyId)
    .eq('account_id', account.id);
  fail(amounts.error, 'Could not read wallet entries.');
  const balanceCents = ledgerBalanceCents(
    ((amounts.data ?? []) as Row[]).map((row) => ({
      amountCents: Number(row.amount_cents),
      direction: row.direction as 'credit' | 'debit',
    })),
  );
  const entries = await pagedRows(
    supabaseAdmin
      .from('wallet_entries')
      .select('id, amount_cents, direction, source, memo, created_at')
      .eq('company_id', actor.companyId)
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit),
    page,
    'Could not read wallet entries.',
  );
  return { account, balanceCents, ...entries };
}

export async function listOrdersPage(actor: TenantActor, page: PageQuery) {
  await assertModule(actor, 'pos');
  return pagedRows(
    supabaseAdmin
      .from('pos_orders')
      .select('id, table_label, status, items, total_cents, payment_status, created_at')
      .eq('company_id', scopedCompanyId(actor))
      .order('created_at', { ascending: false })
      .range(page.offset, page.offset + page.limit),
    page,
    'Could not list orders.',
  );
}

export async function listCamerasPage(actor: TenantActor, page: PageQuery) {
  await assertModule(actor, 'cctv');
  const paged = await pagedRows(
    supabaseAdmin
      .from('cameras')
      .select('id, name, site_label, provider, external_ref')
      .eq('company_id', scopedCompanyId(actor))
      .order('name')
      .range(page.offset, page.offset + page.limit),
    page,
    'Could not list cameras.',
  );
  return {
    ...paged,
    items: paged.items.map((camera) => ({ ...camera, stream: cameraStream(camera.provider ? String(camera.provider) : null) })),
  };
}

export async function listLocationsPage(actor: TenantActor, page: PageQuery) {
  await assertModule(actor, 'find_my_staff');
  const scope = companyOrOwn(actor, canViewStaffHealth(actor.role));
  let query = supabaseAdmin
    .from('staff_locations')
    .select('id, user_id, latitude, longitude, recorded_at, consent')
    .eq('company_id', scope.companyId)
    .eq('consent', true)
    .order('recorded_at', { ascending: false });
  if (scope.ownUserId) query = query.eq('user_id', scope.ownUserId);
  const paged = await pagedRows(query.range(page.offset, page.offset + page.limit), page, 'Could not read locations.');
  return { ...paged, map: mapProviderStatus() };
}

export async function revokeToken(actor: TenantActor, rawToken: string) {
  requireConfigured();
  const { error } = await supabaseAdmin
    .from('api_tokens')
    .delete()
    .eq('token_hash', hashToken(rawToken))
    .eq('company_id', actor.companyId)
    .eq('user_id', actor.userId);
  fail(error, 'Could not revoke the token.');
  await writeAudit(actor, 'auth.token_revoked', 'user', actor.userId, {});
  return { ok: true };
}
