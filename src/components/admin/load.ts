import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import type { UserRole } from '@/types';

import { asRecord, asText, personName } from './format';

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actorEmail: string | null;
  actorName: string | null;
};

export type TeamMember = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole | string;
  isActive: boolean;
  createdAt: string;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: UserRole | string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export type BillingUsage = {
  activePeople: number | null;
  pendingInvites: number | null;
  auditEvents: number | null;
  modulesOn: number | null;
};

async function countRows(table: 'users' | 'invitations' | 'audit_logs' | 'company_modules', companyId: string, filters?: { column: string; value: string | boolean }) {
  let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).eq('company_id', companyId);
  if (filters) query = query.eq(filters.column, filters.value);
  const { count, error } = await query;
  if (error) return null;
  return count ?? 0;
}

export async function loadAuditEntries(companyId: string): Promise<{ entries: AuditEntry[]; error: string | null }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, changes, ip_address, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      console.error(error);
      return { entries: [], error: 'Could not read the audit log.' };
    }

    const rows = data ?? [];
    const actorIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => typeof id === 'string'))];
    const actors = new Map<string, { email: string; name: string }>();
    if (actorIds.length > 0) {
      const people = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('company_id', companyId)
        .in('id', actorIds);
      if (people.error) {
        console.error(people.error);
      } else {
        for (const person of people.data ?? []) {
          actors.set(person.id, {
            email: person.email,
            name: personName(person.first_name, person.last_name, person.email),
          });
        }
      }
    }

    return {
      error: null,
      entries: rows.map((row) => {
        const actor = row.user_id ? actors.get(row.user_id) : undefined;
        return {
          id: row.id,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          changes: asRecord(row.changes),
          ipAddress: asText(row.ip_address),
          createdAt: row.created_at,
          actorEmail: actor?.email ?? null,
          actorName: actor?.name ?? (row.user_id ? 'Unknown member' : 'System'),
        };
      }),
    };
  } catch (error) {
    console.error(error);
    return { entries: [], error: 'Could not read the audit log.' };
  }
}

export async function loadTeam(companyId: string): Promise<{ members: TeamMember[]; invitations: TeamInvitation[]; error: string | null }> {
  try {
    const [membersResult, invitationsResult] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, role, is_active, created_at')
        .eq('company_id', companyId)
        .order('created_at'),
      supabaseAdmin
        .from('invitations')
        .select('id, email, role, status, expires_at, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
    ]);
    if (membersResult.error || invitationsResult.error) {
      console.error(membersResult.error ?? invitationsResult.error);
      return { members: [], invitations: [], error: 'Could not load the team.' };
    }
    return {
      error: null,
      members: (membersResult.data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at,
      })),
      invitations: (invitationsResult.data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status ?? 'pending',
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      })),
    };
  } catch (error) {
    console.error(error);
    return { members: [], invitations: [], error: 'Could not load the team.' };
  }
}

export async function loadBillingUsage(companyId: string): Promise<BillingUsage> {
  try {
    const [activePeople, pendingInvites, auditEvents, modulesOn] = await Promise.all([
      countRows('users', companyId, { column: 'is_active', value: true }),
      countRows('invitations', companyId, { column: 'status', value: 'pending' }),
      countRows('audit_logs', companyId),
      countRows('company_modules', companyId, { column: 'is_enabled', value: true }),
    ]);
    return { activePeople, pendingInvites, auditEvents, modulesOn };
  } catch (error) {
    console.error(error);
    return { activePeople: null, pendingInvites: null, auditEvents: null, modulesOn: null };
  }
}
