import 'server-only';

import { slugCandidate } from '@/lib/auth-utils';
import { moduleNameList, readSettings, tenantStatus, isMissingRelation } from '@/lib/owner/model';
import type {
  AuditInsert,
  AuditRow,
  CompanyModuleRow,
  CompanyRow,
  IndustryRow,
  InvoiceRow,
  ModuleRow,
  NewCompany,
  NewInvitation,
  OwnerStore,
  PublicUser,
  SubscriptionRow,
  UsageCounts,
} from '@/lib/owner/types';
import { PlatformError } from '@/lib/platform-error';
import { supabaseAdmin } from '@/lib/supabase';

type DbError = { code?: string; message: string } | null;
type Row = Record<string, unknown>;

const COMPANY_CAP = 1000;

function throwIfDb(error: DbError, message: string): void {
  if (!error) return;
  console.error(message, { code: error.code ?? null, message: error.message });
  throw new PlatformError('database', message, 500);
}

function missing(error: DbError): boolean {
  return isMissingRelation(error);
}

function relation<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === 'object' ? (first as T) : null;
  }
  if (value && typeof value === 'object') return value as T;
  return null;
}

function mapCompany(row: Row): CompanyRow {
  const industry = relation<{ name?: string; display_name?: string }>(row.industries);
  const settings = readSettings(row.settings);
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    industryId: row.industry_id ? String(row.industry_id) : null,
    industryName: industry?.name ?? null,
    industryDisplayName: industry?.display_name ?? null,
    region: String(row.region ?? 'za'),
    settings,
    createdAt: String(row.created_at ?? ''),
    status: tenantStatus(settings),
  };
}

function mapModule(row: Row): ModuleRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    displayName: String(row.display_name ?? row.name ?? ''),
    description: row.description ? String(row.description) : null,
    category: row.category ? String(row.category) : null,
  };
}

function mapIndustry(row: Row): IndustryRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    displayName: String(row.display_name ?? row.name ?? ''),
    description: row.description ? String(row.description) : null,
    defaultModules: moduleNameList(row.default_modules),
  };
}

function mapAudit(row: Row): AuditRow {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    userId: row.user_id ? String(row.user_id) : null,
    action: String(row.action ?? ''),
    entityType: row.entity_type ? String(row.entity_type) : null,
    entityId: row.entity_id ? String(row.entity_id) : null,
    changes: readSettings(row.changes),
    createdAt: String(row.created_at ?? ''),
  };
}

function mapSubscription(row: Row): SubscriptionRow {
  return {
    companyId: String(row.company_id),
    planCode: String(row.plan_code ?? ''),
    status: String(row.status ?? ''),
    createdAt: String(row.created_at ?? ''),
    currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : null,
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
  };
}

async function countExact(table: string, companyId?: string): Promise<number | null> {
  let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { count, error } = await query;
  if (missing(error)) return null;
  throwIfDb(error, 'Could not count records.');
  return count ?? 0;
}

export const supabaseOwnerStore: OwnerStore = {
  async countCompanies() {
    const count = await countExact('companies');
    if (count === null) throw new PlatformError('not_configured', 'Companies are not available. Apply migrations 001–003.', 503);
    return count;
  },

  async countSuspended() {
    const { count, error } = await supabaseAdmin
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .contains('settings', { status: 'suspended' });
    if (!error) return count ?? 0;
    const listed = await supabaseAdmin.from('companies').select('settings').limit(COMPANY_CAP);
    if (missing(listed.error)) return 0;
    throwIfDb(listed.error, 'Could not count suspended businesses.');
    return (listed.data ?? []).filter((row) => tenantStatus((row as Row).settings) === 'suspended').length;
  },

  countUsers() {
    return countExact('users');
  },

  countTasks() {
    return countExact('tasks');
  },

  async countCompaniesCreatedSince(iso) {
    const { count, error } = await supabaseAdmin
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', iso);
    throwIfDb(error, 'Could not count signups.');
    return count ?? 0;
  },

  async listRecentCompanies(limit) {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, slug, industry_id, region, settings, created_at, industries(name, display_name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    throwIfDb(error, 'Could not list recent businesses.');
    return ((data ?? []) as Row[]).map(mapCompany);
  },

  async companiesCreatedSince(iso) {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('created_at')
      .gte('created_at', iso)
      .limit(COMPANY_CAP);
    throwIfDb(error, 'Could not read signup dates.');
    return ((data ?? []) as Row[]).map((row) => ({ createdAt: String(row.created_at ?? '') }));
  },

  async listSubscriptions() {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('company_id, plan_code, status, created_at, current_period_end, cancel_at_period_end')
      .limit(COMPANY_CAP);
    if (missing(error)) return null;
    throwIfDb(error, 'Could not read subscriptions.');
    return ((data ?? []) as Row[]).map(mapSubscription);
  },

  async subscriptionFor(companyId) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('company_id, plan_code, status, created_at, current_period_end, cancel_at_period_end')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (missing(error)) return 'missing';
    throwIfDb(error, 'Could not read the subscription.');
    const row = (data ?? [])[0] as Row | undefined;
    return row ? mapSubscription(row) : null;
  },

  async invoicesFor(companyId) {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('id, status, currency, amount_due_paise, amount_paid_paise, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(12);
    if (missing(error)) return null;
    throwIfDb(error, 'Could not read invoices.');
    return ((data ?? []) as Row[]).map((row) => ({
      id: String(row.id),
      status: String(row.status ?? ''),
      currency: String(row.currency ?? 'INR'),
      amountDuePaise: Number(row.amount_due_paise ?? 0),
      amountPaidPaise: Number(row.amount_paid_paise ?? 0),
      createdAt: String(row.created_at ?? ''),
    })) satisfies InvoiceRow[];
  },

  async listOwnerAudit(limit) {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('id, company_id, user_id, action, entity_type, entity_id, changes, created_at')
      .ilike('action', 'owner.%')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (missing(error)) return [];
    throwIfDb(error, 'Could not read owner audit.');
    return ((data ?? []) as Row[]).map(mapAudit);
  },

  async searchCompanies(query) {
    let request = supabaseAdmin
      .from('companies')
      .select('id, name, slug, industry_id, region, settings, created_at, industries(name, display_name)')
      .order('created_at', { ascending: false })
      .limit(COMPANY_CAP);
    if (query.search) {
      request = request.or(`name.ilike.%${query.search}%,slug.ilike.%${query.search}%`);
    }
    if (query.industryId) request = request.eq('industry_id', query.industryId);
    const { data, error } = await request;
    throwIfDb(error, 'Could not list businesses.');
    const rows = ((data ?? []) as Row[]).map(mapCompany);
    return { rows, capped: rows.length >= COMPANY_CAP };
  },

  async countUsersFor(ids) {
    const entries = await Promise.all(
      ids.map(async (id) => {
        const count = await countExact('users', id);
        return [id, count] as const;
      }),
    );
    return Object.fromEntries(entries);
  },

  async modulesFor(ids) {
    if (ids.length === 0) return {};
    const { data, error } = await supabaseAdmin
      .from('company_modules')
      .select('company_id, is_enabled, modules(name, display_name)')
      .in('company_id', ids)
      .eq('is_enabled', true);
    throwIfDb(error, 'Could not read enabled modules.');
    const grouped: Record<string, { name: string; displayName: string }[]> = {};
    for (const row of (data ?? []) as Row[]) {
      const companyId = String(row.company_id);
      const entry = relation<{ name?: string; display_name?: string }>(row.modules);
      if (!entry?.name) continue;
      grouped[companyId] ??= [];
      grouped[companyId].push({ name: String(entry.name), displayName: String(entry.display_name ?? entry.name) });
    }
    return grouped;
  },

  async getCompany(id) {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, slug, industry_id, region, settings, created_at, industries(name, display_name)')
      .eq('id', id)
      .maybeSingle();
    throwIfDb(error, 'Could not read the business.');
    return data ? mapCompany(data as Row) : null;
  },

  async listUsers(companyId) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (missing(error)) return [];
    throwIfDb(error, 'Could not list people.');
    return ((data ?? []) as Row[]).map((row) => ({
      id: String(row.id),
      email: String(row.email ?? ''),
      firstName: row.first_name ? String(row.first_name) : null,
      lastName: row.last_name ? String(row.last_name) : null,
      role: String(row.role ?? 'user'),
      isActive: row.is_active !== false,
      createdAt: String(row.created_at ?? ''),
    })) satisfies PublicUser[];
  },

  async catalogue() {
    const { data, error } = await supabaseAdmin
      .from('modules')
      .select('id, name, display_name, description, category')
      .order('category', { ascending: true });
    throwIfDb(error, 'Could not read the module catalogue.');
    return ((data ?? []) as Row[]).map(mapModule);
  },

  async companyModules(companyId) {
    const { data, error } = await supabaseAdmin
      .from('company_modules')
      .select('module_id, is_enabled')
      .eq('company_id', companyId);
    if (missing(error)) return [];
    throwIfDb(error, 'Could not read company modules.');
    return ((data ?? []) as Row[]).map((row) => ({
      moduleId: String(row.module_id),
      isEnabled: row.is_enabled === true,
    })) satisfies CompanyModuleRow[];
  },

  async usage(companyId) {
    const [users, tasks, departments, invitations, auditEvents] = await Promise.all([
      countExact('users', companyId),
      countExact('tasks', companyId),
      countExact('departments', companyId),
      countExact('invitations', companyId),
      countExact('audit_logs', companyId),
    ]);
    return { users, tasks, departments, invitations, auditEvents } satisfies UsageCounts;
  },

  async audit(companyId, limit) {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('id, company_id, user_id, action, entity_type, entity_id, changes, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (missing(error)) return [];
    throwIfDb(error, 'Could not read the audit log.');
    return ((data ?? []) as Row[]).map(mapAudit);
  },

  async updateCompany(id, patch) {
    const column: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) column.name = patch.name;
    if (patch.industryId !== undefined) column.industry_id = patch.industryId;
    if (patch.region !== undefined) column.region = patch.region;
    if (patch.settings !== undefined) column.settings = patch.settings;
    const { error } = await supabaseAdmin.from('companies').update(column).eq('id', id);
    throwIfDb(error, 'Could not update the business.');
  },

  async upsertModule(companyId, moduleId, enabled) {
    const { error } = await supabaseAdmin.from('company_modules').upsert(
      {
        company_id: companyId,
        module_id: moduleId,
        is_enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,module_id' },
    );
    throwIfDb(error, 'Could not update the module.');
  },

  async moduleById(id) {
    const { data, error } = await supabaseAdmin
      .from('modules')
      .select('id, name, display_name, description, category')
      .eq('id', id)
      .maybeSingle();
    throwIfDb(error, 'Could not read the module.');
    return data ? mapModule(data as Row) : null;
  },

  async insertAudit(row: AuditInsert) {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      company_id: row.companyId,
      user_id: row.userId,
      action: row.action,
      entity_type: row.entityType,
      entity_id: row.entityId,
      changes: row.changes,
    });
    throwIfDb(error, 'Could not write the audit log.');
  },

  async industry(id) {
    const { data, error } = await supabaseAdmin
      .from('industries')
      .select('id, name, display_name, description, default_modules')
      .eq('id', id)
      .maybeSingle();
    throwIfDb(error, 'Could not read the industry.');
    return data ? mapIndustry(data as Row) : null;
  },

  async industries() {
    const { data, error } = await supabaseAdmin
      .from('industries')
      .select('id, name, display_name, description, default_modules')
      .order('display_name', { ascending: true });
    throwIfDb(error, 'Could not list industries.');
    return ((data ?? []) as Row[]).map(mapIndustry);
  },

  async availableSlug(name) {
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const candidate = slugCandidate(name, attempt);
      if (!candidate) break;
      const { data, error } = await supabaseAdmin.from('companies').select('id').eq('slug', candidate).maybeSingle();
      throwIfDb(error, 'Could not reserve a company address.');
      if (!data) return candidate;
    }
    throw new PlatformError('conflict', 'Could not reserve a company address.', 409);
  },

  async insertCompany(row: NewCompany) {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert({
        name: row.name,
        slug: row.slug,
        industry_id: row.industryId,
        region: row.region,
        settings: row.settings,
      })
      .select('id, name, slug, industry_id, region, settings, created_at')
      .single();
    throwIfDb(error, 'Could not create the business.');
    return mapCompany(data as Row);
  },

  async deleteCompany(id) {
    const { error } = await supabaseAdmin.from('companies').delete().eq('id', id);
    throwIfDb(error, 'Could not remove the unfinished business.');
  },

  async insertCompanyModules(rows) {
    if (rows.length === 0) return;
    const { error } = await supabaseAdmin.from('company_modules').insert(
      rows.map((row) => ({
        company_id: row.companyId,
        module_id: row.moduleId,
        is_enabled: row.isEnabled,
      })),
    );
    throwIfDb(error, 'Could not enable modules.');
  },

  async insertInvitation(row: NewInvitation) {
    const { data, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        company_id: row.companyId,
        email: row.email,
        role: row.role,
        invited_by_id: row.invitedById,
        token: row.tokenHash,
        expires_at: row.expiresAt,
        status: 'pending',
      })
      .select('id, expires_at')
      .single();
    if (error?.code === '23505') {
      throw new PlatformError('conflict', 'That email already has an invitation.', 409);
    }
    throwIfDb(error, 'Could not create the invitation.');
    const created = data as Row;
    return { id: String(created.id), expiresAt: String(created.expires_at ?? row.expiresAt) };
  },

  async companySlug(id) {
    const { data, error } = await supabaseAdmin.from('companies').select('slug').eq('id', id).maybeSingle();
    throwIfDb(error, 'Could not read the company.');
    const slug = data ? (data as Row).slug : null;
    return typeof slug === 'string' && slug.length > 0 ? slug : null;
  },

  async enabledModuleCounts() {
    const { data, error } = await supabaseAdmin.from('company_modules').select('module_id').eq('is_enabled', true).limit(5000);
    if (missing(error)) return null;
    throwIfDb(error, 'Could not count enabled modules.');
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Row[]) {
      const id = String(row.module_id);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  },
};
