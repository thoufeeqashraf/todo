import { PlatformError } from '@/lib/platform-error';
import {
  canManagePeople,
  canSeeCompanyTasks,
  isUserRole,
  moduleEnabled,
  type UserRole,
} from '@/lib/platform-rules';

export interface ScopeActor {
  companyId: string;
  userId: string;
  role: UserRole;
}

/** Always the caller's company. A different requested company is rejected. */
export function scopedCompanyId(actor: { companyId: string }, requestedCompanyId?: string | null) {
  if (requestedCompanyId && requestedCompanyId !== actor.companyId) {
    throw new PlatformError('forbidden', 'Cross-tenant access is not allowed.', 403);
  }
  return actor.companyId;
}

export function ownUserFilter(actor: { role: UserRole; userId: string }, companyWide: boolean) {
  return companyWide ? null : actor.userId;
}

export function companyOrOwn(actor: ScopeActor, companyWide: boolean) {
  return {
    companyId: scopedCompanyId(actor),
    ownUserId: ownUserFilter(actor, companyWide),
  };
}

export function taskListScope(actor: ScopeActor) {
  return companyOrOwn(actor, canSeeCompanyTasks(actor.role));
}

export function assertModuleEnabled(enabled: Iterable<string>, name: string) {
  if (!moduleEnabled(enabled, name)) {
    throw new PlatformError('module_disabled', `The ${name} module is off for this company.`, 403, {
      module: name,
    });
  }
}

export function canReadTask(
  actor: { role: UserRole; userId: string },
  task: { assigned_to_id: string | null; assigned_by_id: string | null },
) {
  if (canSeeCompanyTasks(actor.role)) return true;
  return task.assigned_to_id === actor.userId || task.assigned_by_id === actor.userId;
}

export function canReadIncident(actor: { role: UserRole; userId: string }, incident: { reported_by: string | null }) {
  if (canSeeCompanyTasks(actor.role)) return true;
  return incident.reported_by === actor.userId;
}

export function canReadSchedule(actor: { role: UserRole; userId: string }, schedule: { user_id: string }) {
  if (canSeeCompanyTasks(actor.role)) return true;
  return schedule.user_id === actor.userId;
}

export function taskUpdateDecision(
  actor: { role: UserRole; userId: string },
  task: { assigned_to_id: string | null; assigned_by_id: string | null },
  patch: { assignedToId?: string | null },
): { ok: true } | { ok: false; status: number; code: string; message: string } {
  if (!canReadTask(actor, task)) {
    return { ok: false, status: 404, code: 'not_found', message: 'Task not found.' };
  }
  if (!canSeeCompanyTasks(actor.role) && patch.assignedToId && patch.assignedToId !== actor.userId) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: 'Floor staff can only keep tasks on their own list.',
    };
  }
  return { ok: true };
}

export function taskDeleteDecision(actor: { role: UserRole }): { ok: true } | { ok: false; status: number; code: string; message: string } {
  if (!canManagePeople(actor.role)) {
    return { ok: false, status: 403, code: 'forbidden', message: 'Only a manager or admin can delete a task.' };
  }
  return { ok: true };
}

export function staffEditDecision(
  actor: { role: UserRole; userId: string },
  target: { role: string; userId: string },
  patch: { role?: UserRole; isActive?: boolean },
): 'ok' | 'forbidden' {
  if (actor.role === 'user' || !isUserRole(target.role)) return 'forbidden';
  const changesOwnRole = Boolean(patch.role && patch.role !== actor.role);
  if (actor.userId === target.userId && (changesOwnRole || patch.isActive === false)) return 'forbidden';
  if (actor.role === 'manager' && (target.role === 'admin' || patch.role === 'admin')) return 'forbidden';
  return 'ok';
}

/** Another person's wallet is admin-only. The company check stays in the service. */
export function walletReadUserId(actor: { userId: string; role: UserRole }, requested?: string | null): string | 'forbidden' {
  if (!requested || requested === actor.userId) return actor.userId;
  if (actor.role !== 'admin') return 'forbidden';
  return requested;
}
