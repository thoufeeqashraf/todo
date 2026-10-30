import { randomBytes } from 'node:crypto';

import { z } from 'zod';

import { slugCandidate } from '@/lib/auth-utils';
import type { OwnerAuth, OwnerIdentity } from '@/lib/owner/guard';
import {
  latestByCompany,
  mergeTenantStatus,
  sanitizeSearch,
  signupBuckets,
  summarizeBilling,
  tenantStatus,
} from '@/lib/owner/model';
import type {
  AuditRow,
  CompanyRow,
  IndustryRow,
  ModuleRow,
  OwnerStore,
  PublicUser,
  TenantQuery,
} from '@/lib/owner/types';
import { industryLabels } from '@/lib/platform-rules';
import { PlatformError } from '@/lib/platform-error';
import { hashToken, isUuid } from '@/lib/request-guards';

const regionSchema = z.enum(['za', 'eu', 'multi']);

const createSchema = z.object({
  companyName: z.string().trim().min(2).max(255),
  industryId: z.string().uuid(),
  region: regionSchema.optional().default('za'),
  adminEmail: z.string().trim().email().max(255),
  adminFirstName: z.string().trim().min(1).max(100),
  adminLastName: z.string().trim().min(1).max(100),
});

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    industryId: z.string().uuid().optional(),
    region: regionSchema.optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Provide at least one field to change.',
  });

const moduleSchema = z.object({
  moduleId: z.string().uuid(),
  isEnabled: z.boolean(),
});

const inviteSchema = z.object({
  email: z.string().trim().email().max(255),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export interface OwnerResult {
  status: number;
  body: unknown;
}

function denial(auth: Extract<OwnerAuth, { ok: false }>): OwnerResult {
  return { status: auth.status, body: { error: { code: auth.code, message: auth.message } } };
}

function fail(status: number, code: string, message: string): OwnerResult {
  return { status, body: { error: { code, message } } };
}

export function failureResult(error: unknown): OwnerResult {
  if (error instanceof PlatformError) {
    return fail(error.status, error.code, error.message);
  }
  if (error instanceof z.ZodError) {
    return fail(400, 'invalid', 'Invalid input.');
  }
  console.error('owner command failed', error instanceof Error ? error.name : 'unknown');
  return fail(500, 'internal', 'Internal server error.');
}

export function ownerParts(parts: readonly string[]): string[] {
  return parts[0] === 'owner' ? parts.slice(1) : [...parts];
}

function parseTenantQuery(search: URLSearchParams): TenantQuery {
  const limitRaw = search.get('limit');
  const offsetRaw = search.get('offset');
  const limit = limitRaw == null || limitRaw === '' ? 25 : Number(limitRaw);
  const offset = offsetRaw == null || offsetRaw === '' ? 0 : Number(offsetRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new PlatformError('invalid', 'Invalid input.', 400);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 100_000) {
    throw new PlatformError('invalid', 'Invalid input.', 400);
  }
  const statusRaw = search.get('status') ?? 'all';
  if (statusRaw !== 'all' && statusRaw !== 'active' && statusRaw !== 'suspended') {
    throw new PlatformError('invalid', 'Invalid input.', 400);
  }
  const planRaw = search.get('plan') ?? 'all';
  if (planRaw !== 'all' && planRaw !== 'starter' && planRaw !== 'growth' && planRaw !== 'scale' && planRaw !== 'none') {
    throw new PlatformError('invalid', 'Invalid input.', 400);
  }
  const industry = search.get('industryId');
  if (industry && !isUuid(industry)) throw new PlatformError('invalid', 'Invalid input.', 400);
  return {
    search: sanitizeSearch(search.get('q')),
    status: statusRaw,
    industryId: industry || null,
    plan: planRaw,
    limit,
    offset,
  };
}

function requireId(parts: string[], index: number): string {
  const id = parts[index] ?? '';
  if (!isUuid(id)) throw new PlatformError('invalid', 'Invalid input.', 400);
  return id;
}

export async function buildOverview(store: OwnerStore, now = new Date()) {
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [tenants, suspended, users, tasks, signups7d, signups30d, recent, created, subscriptions, audits] =
    await Promise.all([
      store.countCompanies(),
      store.countSuspended(),
      store.countUsers(),
      store.countTasks(),
      store.countCompaniesCreatedSince(since7),
      store.countCompaniesCreatedSince(since30),
      store.listRecentCompanies(8),
      store.companiesCreatedSince(since30),
      store.listSubscriptions(),
      store.listOwnerAudit(12),
    ]);
  return {
    generatedAt: now.toISOString(),
    totals: {
      tenants,
      activeTenants: Math.max(0, tenants - suspended),
      suspendedTenants: suspended,
      users,
      tasks,
      signups7d,
      signups30d,
    },
    recentSignups: recent.map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      createdAt: company.createdAt,
      industry: company.industryDisplayName,
      status: company.status,
    })),
    signupsByDay: signupBuckets(
      created.map((row) => row.createdAt),
      30,
      now,
    ),
    billing: summarizeBilling(
      subscriptions?.map((row) => ({ planCode: row.planCode, status: row.status })) ?? null,
    ),
    recentOwnerActions: audits.map(presentAudit),
  };
}

function presentAudit(row: AuditRow) {
  return {
    id: row.id,
    companyId: row.companyId,
    userId: row.userId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    changes: row.changes,
    createdAt: row.createdAt,
  };
}

export async function listTenants(store: OwnerStore, query: TenantQuery) {
  const [{ rows, capped }, subscriptions] = await Promise.all([
    store.searchCompanies({ search: query.search, industryId: query.industryId }),
    query.plan === 'all' ? Promise.resolve(null) : store.listSubscriptions(),
  ]);
  let filtered = rows;
  if (query.status !== 'all') filtered = filtered.filter((row) => row.status === query.status);
  const billingAvailable = query.plan === 'all' ? true : subscriptions !== null;
  const latest = subscriptions ? latestByCompany(subscriptions) : null;
  if (query.plan !== 'all') {
    if (!latest) {
      return {
        items: [],
        page: { limit: query.limit, offset: query.offset, total: 0, hasMore: false },
        billingAvailable: false,
        capped,
      };
    }
    filtered = filtered.filter((row) => {
      const plan = latest.get(row.id);
      if (query.plan === 'none') return !plan;
      return plan?.planCode === query.plan;
    });
  }
  const total = filtered.length;
  const pageRows = filtered.slice(query.offset, query.offset + query.limit);
  const ids = pageRows.map((row) => row.id);
  const [counts, modules, plans] = await Promise.all([
    ids.length ? store.countUsersFor(ids) : Promise.resolve({} as Record<string, number | null>),
    ids.length ? store.modulesFor(ids) : Promise.resolve({} as Record<string, { name: string; displayName: string }[]>),
    query.plan === 'all' ? store.listSubscriptions() : Promise.resolve(subscriptions),
  ]);
  const planMap = plans ? latestByCompany(plans) : null;
  return {
    items: pageRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      industry: row.industryDisplayName,
      industryName: row.industryName,
      region: row.region,
      status: row.status,
      plan: planMap?.get(row.id)
        ? { code: planMap.get(row.id)?.planCode, status: planMap.get(row.id)?.status }
        : null,
      userCount: counts[row.id] ?? null,
      modules: modules[row.id] ?? [],
      createdAt: row.createdAt,
    })),
    page: {
      limit: query.limit,
      offset: query.offset,
      total,
      hasMore: query.offset + query.limit < total,
    },
    billingAvailable: plans !== null && billingAvailable,
    capped,
  };
}

async function presentModules(store: OwnerStore, companyId: string) {
  const [catalogue, rows] = await Promise.all([store.catalogue(), store.companyModules(companyId)]);
  const enabled = new Map(rows.map((row) => [row.moduleId, row.isEnabled]));
  return catalogue.map((module) => ({
    id: module.id,
    name: module.name,
    displayName: module.displayName,
    description: module.description,
    category: module.category,
    enabled: enabled.get(module.id) === true,
  }));
}

export async function getTenant(store: OwnerStore, id: string) {
  const company = await store.getCompany(id);
  if (!company) return null;
  const [users, modules, usage, audit, subscription, invoices] = await Promise.all([
    store.listUsers(id),
    presentModules(store, id),
    store.usage(id),
    store.audit(id, 40),
    store.subscriptionFor(id),
    store.invoicesFor(id),
  ]);
  const billingMissing = subscription === 'missing' || invoices === null;
  return {
    company: presentCompany(company),
    users: users.map(presentUser),
    modules,
    usage: { ...usage, enabledModules: modules.filter((module) => module.enabled).length },
    billing: {
      available: !billingMissing,
      subscription:
        subscription && subscription !== 'missing'
          ? {
              planCode: subscription.planCode,
              status: subscription.status,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
          : null,
      invoices: invoices ?? [],
    },
    audit: audit.map(presentAudit),
  };
}

function presentCompany(company: CompanyRow) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    industryId: company.industryId,
    industry: company.industryDisplayName,
    industryName: company.industryName,
    region: company.region,
    status: company.status,
    createdAt: company.createdAt,
    settings: {
      status: tenantStatus(company.settings),
      suspendedAt: typeof company.settings.suspendedAt === 'string' ? company.settings.suspendedAt : null,
      reactivatedAt: typeof company.settings.reactivatedAt === 'string' ? company.settings.reactivatedAt : null,
    },
  };
}

function presentUser(user: PublicUser) {
  return user;
}

export async function updateTenant(
  owner: OwnerIdentity,
  id: string,
  patch: z.infer<typeof patchSchema>,
  store: OwnerStore,
) {
  const current = await store.getCompany(id);
  if (!current) return fail(404, 'not_found', 'Tenant not found.');
  if (patch.industryId) {
    const industry = await store.industry(patch.industryId);
    if (!industry) return fail(400, 'invalid', 'Invalid industry selected.');
  }
  const changes: Record<string, unknown> = {};
  const column: { name?: string; industryId?: string; region?: string; settings?: Record<string, unknown> } = {};
  if (patch.name && patch.name !== current.name) {
    column.name = patch.name;
    changes.name = patch.name;
  }
  if (patch.industryId && patch.industryId !== current.industryId) {
    column.industryId = patch.industryId;
    changes.industryId = patch.industryId;
  }
  if (patch.region && patch.region !== current.region) {
    column.region = patch.region;
    changes.region = patch.region;
  }
  if (patch.status && patch.status !== current.status) {
    column.settings = mergeTenantStatus(current.settings, patch.status, owner.userId);
    changes.status = patch.status;
  }
  if (Object.keys(column).length === 0) {
    return { status: 200, body: { company: presentCompany(current) } };
  }
  await store.updateCompany(id, column);
  const statusChanged = patch.status && patch.status !== current.status;
  if (statusChanged && patch.status) {
    await store.insertAudit({
      companyId: id,
      userId: owner.userId,
      action: patch.status === 'suspended' ? 'owner.tenant.suspended' : 'owner.tenant.reactivated',
      entityType: 'company',
      entityId: id,
      changes,
    });
  }
  if (changes.name || changes.industryId || changes.region) {
    await store.insertAudit({
      companyId: id,
      userId: owner.userId,
      action: 'owner.tenant.updated',
      entityType: 'company',
      entityId: id,
      changes,
    });
  }
  const next = await store.getCompany(id);
  return { status: 200, body: { company: next ? presentCompany(next) : presentCompany(current) } };
}

export async function setTenantModule(owner: OwnerIdentity, companyId: string, moduleId: string, enabled: boolean, store: OwnerStore) {
  const company = await store.getCompany(companyId);
  if (!company) return fail(404, 'not_found', 'Tenant not found.');
  const catalogueItem = await store.moduleById(moduleId);
  if (!catalogueItem) return fail(400, 'invalid', 'Unknown module.');
  await store.upsertModule(companyId, moduleId, enabled);
  await store.insertAudit({
    companyId,
    userId: owner.userId,
    action: 'owner.module.updated',
    entityType: 'module',
    entityId: moduleId,
    changes: { module: catalogueItem.name, enabled },
  });
  return { status: 200, body: { moduleId, name: catalogueItem.name, enabled } };
}

const CORE_WITH_INVITE = ['staff', 'tasks', 'notifications'];

export async function createTenant(owner: OwnerIdentity, input: z.infer<typeof createSchema>, store: OwnerStore) {
  if (!slugCandidate(input.companyName, 0)) throw new PlatformError('invalid', 'Invalid input.', 400);
  const industry = await store.industry(input.industryId);
  if (!industry) return fail(400, 'invalid', 'Invalid industry selected.');
  const catalogue = await store.catalogue();
  const wanted = new Set([...industry.defaultModules, ...CORE_WITH_INVITE]);
  const modules = catalogue.filter((module) => wanted.has(module.name));
  const slug = await store.availableSlug(input.companyName);
  const company = await store.insertCompany({
    name: input.companyName,
    slug,
    industryId: input.industryId,
    region: input.region,
    settings: { status: 'active', createdBy: owner.userId },
  });
  try {
    if (modules.length > 0) {
      await store.insertCompanyModules(
        modules.map((module) => ({ companyId: company.id, moduleId: module.id, isEnabled: true })),
      );
    }
    const invitation = await writeAdminInvite(owner, company.id, input.adminEmail, store);
    await store.insertAudit({
      companyId: company.id,
      userId: owner.userId,
      action: 'owner.tenant.created',
      entityType: 'company',
      entityId: company.id,
      changes: { industryId: input.industryId, region: input.region, modules: modules.map((module) => module.name) },
    });
    return {
      status: 201,
      body: {
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          region: input.region,
          industryId: input.industryId,
          status: 'active' as const,
        },
        invitation,
        modulesEnabled: modules.map((module) => module.name),
        emailSent: false,
      },
    };
  } catch (error) {
    await store.deleteCompany(company.id).catch(() => undefined);
    throw error;
  }
}

async function writeAdminInvite(owner: OwnerIdentity, companyId: string, email: string, store: OwnerStore) {
  const raw = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const created = await store.insertInvitation({
    companyId,
    email: email.toLowerCase(),
    role: 'admin',
    invitedById: owner.userId,
    tokenHash: hashToken(raw),
    expiresAt,
  });
  await store.insertAudit({
    companyId,
    userId: owner.userId,
    action: 'owner.invitation.created',
    entityType: 'invitation',
    entityId: created.id,
    changes: { email: email.toLowerCase(), role: 'admin' },
  });
  return {
    id: created.id,
    email: email.toLowerCase(),
    role: 'admin' as const,
    expiresAt: created.expiresAt,
    invitePath: `/invite/${raw}`,
    emailSent: false,
  };
}

export async function inviteTenantAdmin(
  owner: OwnerIdentity,
  companyId: string,
  input: z.infer<typeof inviteSchema>,
  store: OwnerStore,
) {
  const company = await store.getCompany(companyId);
  if (!company) return fail(404, 'not_found', 'Tenant not found.');
  const catalogue = await store.catalogue();
  const staff = catalogue.find((module) => module.name === 'staff');
  if (staff) {
    const current = await store.companyModules(companyId);
    const row = current.find((item) => item.moduleId === staff.id);
    if (!row?.isEnabled) await store.upsertModule(companyId, staff.id, true);
  }
  const invitation = await writeAdminInvite(owner, companyId, input.email, store);
  return { status: 201, body: { invitation, adminFirstName: input.firstName, adminLastName: input.lastName } };
}

export async function listIndustryTemplates(store: OwnerStore) {
  const [industries, catalogue] = await Promise.all([store.industries(), store.catalogue()]);
  const byName = new Map(catalogue.map((module) => [module.name, module]));
  return industries.map((industry) => ({
    ...presentIndustry(industry),
    modules: industry.defaultModules.map((name) => ({
      name,
      displayName: byName.get(name)?.displayName ?? name,
      inCatalogue: byName.has(name),
    })),
    labels: industryLabels(industry.name),
  }));
}

function presentIndustry(industry: IndustryRow) {
  return {
    id: industry.id,
    name: industry.name,
    displayName: industry.displayName,
    description: industry.description,
    defaultModules: industry.defaultModules,
  };
}

export async function listModuleCatalogue(store: OwnerStore) {
  const [catalogue, counts] = await Promise.all([store.catalogue(), store.enabledModuleCounts()]);
  return {
    modules: catalogue.map((module: ModuleRow) => ({
      ...module,
      enabledCompanies: counts ? (counts[module.id] ?? 0) : null,
    })),
    countsAvailable: counts !== null,
  };
}

export async function executeOwner(input: {
  auth: OwnerAuth;
  method: string;
  parts: readonly string[];
  searchParams: URLSearchParams;
  body: unknown;
  store: OwnerStore;
}): Promise<OwnerResult> {
  if (!input.auth.ok) return denial(input.auth);
  try {
    return await dispatchOwnerCommand(input.auth.owner, input);
  } catch (error) {
    return failureResult(error);
  }
}

async function dispatchOwnerCommand(
  owner: OwnerIdentity,
  input: {
    method: string;
    parts: readonly string[];
    searchParams: URLSearchParams;
    body: unknown;
    store: OwnerStore;
  },
): Promise<OwnerResult> {
  const parts = ownerParts(input.parts);
  const key = `${input.method} ${parts.join('/')}`;
  const { store } = input;

  if (key === 'GET overview') return { status: 200, body: await buildOverview(store) };
  if (key === 'GET tenants') return { status: 200, body: await listTenants(store, parseTenantQuery(input.searchParams)) };
  if (key === 'POST tenants') return createTenant(owner, createSchema.parse(input.body), store);
  if (key === 'GET industries') return { status: 200, body: { industries: await listIndustryTemplates(store) } };
  if (key === 'GET modules') return { status: 200, body: await listModuleCatalogue(store) };

  if (parts[0] === 'tenants' && parts.length >= 2) {
    const id = requireId(parts, 1);
    if (parts.length === 2 && input.method === 'GET') {
      const tenant = await getTenant(store, id);
      if (!tenant) return fail(404, 'not_found', 'Tenant not found.');
      return { status: 200, body: tenant };
    }
    if (parts.length === 2 && input.method === 'PATCH') {
      return updateTenant(owner, id, patchSchema.parse(input.body), store);
    }
    if (parts.length === 3 && parts[2] === 'audit' && input.method === 'GET') {
      const company = await store.getCompany(id);
      if (!company) return fail(404, 'not_found', 'Tenant not found.');
      const rows = await store.audit(id, 40);
      return { status: 200, body: { items: rows.map(presentAudit) } };
    }
    if (parts.length === 3 && parts[2] === 'modules' && input.method === 'PATCH') {
      const parsed = moduleSchema.parse(input.body);
      return setTenantModule(owner, id, parsed.moduleId, parsed.isEnabled, store);
    }
    if (parts.length === 3 && parts[2] === 'invitations' && input.method === 'POST') {
      return inviteTenantAdmin(owner, id, inviteSchema.parse(input.body), store);
    }
  }

  return fail(404, 'not_found', 'Unknown owner route.');
}
