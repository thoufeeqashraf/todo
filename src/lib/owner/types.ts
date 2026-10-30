import type { TenantStatus } from '@/lib/owner/model';

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  industryId: string | null;
  industryName: string | null;
  industryDisplayName: string | null;
  region: string;
  settings: Record<string, unknown>;
  createdAt: string;
  status: TenantStatus;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface ModuleRow {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string | null;
}

export interface IndustryRow {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  defaultModules: string[];
}

export interface SubscriptionRow {
  companyId: string;
  planCode: string;
  status: string;
  createdAt: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface InvoiceRow {
  id: string;
  status: string;
  currency: string;
  amountDuePaise: number;
  amountPaidPaise: number;
  createdAt: string;
}

export interface AuditRow {
  id: string;
  companyId: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  changes: Record<string, unknown>;
  createdAt: string;
}

export interface AuditInsert {
  companyId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown>;
}

export interface UsageCounts {
  users: number | null;
  tasks: number | null;
  departments: number | null;
  invitations: number | null;
  auditEvents: number | null;
}

export interface CompanyModuleRow {
  moduleId: string;
  isEnabled: boolean;
}

export interface NewCompany {
  name: string;
  slug: string;
  industryId: string;
  region: string;
  settings: Record<string, unknown>;
}

export interface NewInvitation {
  companyId: string;
  email: string;
  role: 'admin';
  invitedById: string;
  tokenHash: string;
  expiresAt: string;
}

export interface TenantQuery {
  search: string;
  status: 'all' | TenantStatus;
  industryId: string | null;
  plan: 'all' | 'starter' | 'growth' | 'scale' | 'none';
  limit: number;
  offset: number;
}

export interface OwnerStore {
  countCompanies(): Promise<number>;
  countSuspended(): Promise<number>;
  countUsers(): Promise<number | null>;
  countTasks(): Promise<number | null>;
  countCompaniesCreatedSince(iso: string): Promise<number>;
  listRecentCompanies(limit: number): Promise<CompanyRow[]>;
  companiesCreatedSince(iso: string): Promise<{ createdAt: string }[]>;
  listSubscriptions(): Promise<SubscriptionRow[] | null>;
  subscriptionFor(companyId: string): Promise<SubscriptionRow | null | 'missing'>;
  invoicesFor(companyId: string): Promise<InvoiceRow[] | null>;
  listOwnerAudit(limit: number): Promise<AuditRow[]>;
  searchCompanies(query: Pick<TenantQuery, 'search' | 'industryId'>): Promise<{ rows: CompanyRow[]; capped: boolean }>;
  countUsersFor(ids: string[]): Promise<Record<string, number | null>>;
  modulesFor(ids: string[]): Promise<Record<string, { name: string; displayName: string }[]>>;
  getCompany(id: string): Promise<CompanyRow | null>;
  listUsers(companyId: string): Promise<PublicUser[]>;
  catalogue(): Promise<ModuleRow[]>;
  companyModules(companyId: string): Promise<CompanyModuleRow[]>;
  usage(companyId: string): Promise<UsageCounts>;
  audit(companyId: string, limit: number): Promise<AuditRow[]>;
  updateCompany(
    id: string,
    patch: { name?: string; industryId?: string; region?: string; settings?: Record<string, unknown> },
  ): Promise<void>;
  upsertModule(companyId: string, moduleId: string, enabled: boolean): Promise<void>;
  moduleById(id: string): Promise<ModuleRow | null>;
  insertAudit(row: AuditInsert): Promise<void>;
  industry(id: string): Promise<IndustryRow | null>;
  industries(): Promise<IndustryRow[]>;
  availableSlug(name: string): Promise<string>;
  insertCompany(row: NewCompany): Promise<CompanyRow>;
  deleteCompany(id: string): Promise<void>;
  insertCompanyModules(rows: { companyId: string; moduleId: string; isEnabled: boolean }[]): Promise<void>;
  insertInvitation(row: NewInvitation): Promise<{ id: string; expiresAt: string }>;
  companySlug(id: string): Promise<string | null>;
  enabledModuleCounts(): Promise<Record<string, number> | null>;
}
