'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireCustomerSession } from '@/lib/customer-session';
import { PlatformError } from '@/lib/platform-error';
import { canManagePeople } from '@/lib/platform-rules';
import { assertModule, markNotificationRead, writeAudit, type TenantActor } from '@/lib/services/tenant';
import { supabaseAdmin } from '@/lib/supabase';

import { isUuid, parseClientDirectory, type ClientRecord } from './model';
import { clientsModuleId } from './queries';

function pack(error: unknown) {
  if (error instanceof PlatformError) return { ok: false as const, error: error.message };
  if (error instanceof z.ZodError) return { ok: false as const, error: 'Check the client details and try again.' };
  if (error instanceof Error && error.message === 'Not authenticated') {
    return { ok: false as const, error: 'Sign in again.' };
  }
  console.error(error);
  return { ok: false as const, error: 'Something went wrong.' };
}

async function actor(): Promise<TenantActor> {
  const session = await requireCustomerSession();
  return {
    userId: session.user.id,
    companyId: session.companyId,
    role: session.user.role,
    email: session.user.email,
  };
}

const clientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  organization: z.string().trim().max(160).default(''),
  email: z.string().trim().max(255).default(''),
  phone: z.string().trim().max(40).default(''),
  status: z.enum(['lead', 'active', 'paused']),
  notes: z.string().trim().max(2000).default(''),
});

export async function saveClient(input: unknown) {
  try {
    const current = await actor();
    await assertModule(current, 'clients');
    if (!canManagePeople(current.role)) {
      throw new PlatformError('forbidden', 'Only a manager or admin can update clients.', 403);
    }
    const data = clientSchema.parse(input);
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { ok: false as const, error: 'Enter a valid email or leave it blank.' };
    }
    if (data.phone && !/^[0-9+().\-\s]{3,40}$/.test(data.phone)) {
      return { ok: false as const, error: 'Enter a valid phone number or leave it blank.' };
    }

    const { moduleId, settings } = await clientsModuleId(current.companyId);
    const base =
      settings && typeof settings === 'object' && !Array.isArray(settings)
        ? { ...(settings as Record<string, unknown>) }
        : {};
    const existing = parseClientDirectory(base.clients);
    const now = new Date().toISOString();
    let next: ClientRecord[];
    if (data.id) {
      if (!existing.some((client) => client.id === data.id)) {
        throw new PlatformError('not_found', 'That client is not in this company.', 404);
      }
      next = existing.map((client) =>
        client.id === data.id
          ? {
              ...client,
              name: data.name,
              organization: data.organization,
              email: data.email,
              phone: data.phone,
              status: data.status,
              notes: data.notes,
            }
          : client,
      );
    } else {
      if (existing.length >= 200) {
        return { ok: false as const, error: 'This company already has 200 clients stored.' };
      }
      next = [
        {
          id: crypto.randomUUID(),
          name: data.name,
          organization: data.organization,
          email: data.email,
          phone: data.phone,
          status: data.status,
          notes: data.notes,
          createdAt: now,
        },
        ...existing,
      ];
    }

    const { error } = await supabaseAdmin
      .from('company_modules')
      .update({ settings: { ...base, clients: next }, updated_at: now })
      .eq('company_id', current.companyId)
      .eq('module_id', moduleId)
      .eq('is_enabled', true);
    if (error) throw new PlatformError('database', 'Could not save the client.', 500);

    const savedId = data.id ?? next[0]?.id ?? null;
    if (savedId && isUuid(moduleId)) {
      await writeAudit(current, data.id ? 'client.updated' : 'client.created', 'module', moduleId, {
        clientId: savedId,
        name: data.name,
      });
    }
    revalidatePath('/customer/clients');
    return { ok: true as const, clients: next };
  } catch (error) {
    return pack(error);
  }
}

export async function markInboxRead(id: string) {
  try {
    const current = await actor();
    if (!isUuid(id)) return { ok: false as const, error: 'That notification is not valid.' };
    await markNotificationRead(current, id);
    revalidatePath('/customer/notifications');
    return { ok: true as const };
  } catch (error) {
    return pack(error);
  }
}

export async function markInboxReadMany(ids: string[]) {
  try {
    const current = await actor();
    const unique = [...new Set(ids)].filter((id) => isUuid(id)).slice(0, 50);
    for (const id of unique) {
      await markNotificationRead(current, id);
    }
    revalidatePath('/customer/notifications');
    return { ok: true as const, ids: unique };
  } catch (error) {
    return pack(error);
  }
}
