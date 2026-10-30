'use server';

import { redirect } from 'next/navigation';

import { clearCustomerSession, requireCustomerSession } from '@/lib/customer-session';
import { PlatformError } from '@/lib/platform-error';
import type { TenantActor } from '@/lib/services/tenant';
import * as tenant from '@/lib/services/tenant';

async function actor(): Promise<TenantActor> {
  const session = await requireCustomerSession();
  return {
    userId: session.user.id,
    companyId: session.companyId,
    role: session.user.role,
    email: session.user.email,
  };
}

function pack(error: unknown) {
  if (error instanceof PlatformError) {
    return { ok: false as const, error: error.message, code: error.code };
  }
  if (error instanceof Error && error.message === 'Not authenticated') {
    return { ok: false as const, error: 'Sign in again.', code: 'unauthorized' };
  }
  console.error(error);
  return { ok: false as const, error: 'Something went wrong.', code: 'internal' };
}

const blurbs: Record<string, string> = {
  staff: 'People, departments, and invitations. Email is not connected, so copy the invite link.',
  scheduling: 'Shifts for this company. AI roster fill is not implemented.',
  incidents: 'Report and review incidents inside this company.',
  attendance: 'Geofence clock-in. A travel day counts only after a manager saves one. Maps are not connected.',
  health: 'Provisional rules score for managers. This is not an AI model.',
  wallet: 'Internal ledger only. Transaction Junction top-up is a stub and does not move money.',
  pos: 'Orders stay unpaid. Payment capture is a stub.',
  cctv: 'Camera registry only. There is no live stream.',
  'mini-apps': 'No partner mini-apps are connected.',
  find: 'Consented coordinates only. No map tiles.',
  notifications: 'In-app notices for this user. Push delivery is not connected.',
  audit: 'Admin audit trail for this company.',
  onboarding: 'Setup checklist from data already stored for this company.',
  reports: 'Task counts for this company. This is a partial report.',
  settings: 'Company name and hosting region. Region stays za, eu, or multi.',
};

export async function logoutCustomer() {
  await clearCustomerSession();
  redirect('/customer-login');
}

export async function loadModule(slug: string) {
  try {
    const current = await actor();
    const data = await readModule(slug, current);
    return { ok: true as const, blurb: blurbs[slug] ?? 'Unknown area.', data };
  } catch (error) {
    return pack(error);
  }
}

async function readModule(slug: string, current: TenantActor) {
  switch (slug) {
    case 'staff':
      return { users: await tenant.listUsers(current), departments: await tenant.listDepartments(current) };
    case 'scheduling': {
      const schedules = await tenant.listSchedules(current);
      try {
        return { schedules, users: await tenant.listUsers(current) };
      } catch {
        return { schedules, users: [] };
      }
    }
    case 'incidents':
      return { incidents: await tenant.listIncidents(current) };
    case 'attendance':
      return {
        note: 'Save a geofence, then clock in with device coordinates. Travel days are stored only when a manager grants one.',
      };
    case 'health':
      return { scores: await tenant.staffHealth(current) };
    case 'wallet':
      return tenant.walletView(current);
    case 'pos':
      return { orders: await tenant.listOrders(current) };
    case 'cctv':
      return { cameras: await tenant.listCameras(current) };
    case 'mini-apps':
      return tenant.listMiniApps(current);
    case 'find':
      return tenant.listLocations(current);
    case 'notifications':
      return { notifications: await tenant.listNotifications(current) };
    case 'audit':
      return { entries: await tenant.listAudit(current) };
    case 'onboarding':
      return tenant.onboarding(current);
    case 'reports':
      return tenant.reportSummary(current);
    case 'settings':
      return { settings: await tenant.companySettings(current) };
    default:
      throw new PlatformError('not_found', 'That area is not on the web console.', 404);
  }
}

export async function runModule(slug: string, payload: Record<string, string>) {
  try {
    const current = await actor();
    const data = await writeModule(slug, current, payload);
    return { ok: true as const, data };
  } catch (error) {
    return pack(error);
  }
}

async function writeModule(slug: string, current: TenantActor, payload: Record<string, string>) {
  switch (slug) {
    case 'staff':
      if (payload.intent === 'department') {
        return tenant.createDepartment(current, payload.name);
      }
      return tenant.createInvitation(current, payload.email, payload.role === 'admin' || payload.role === 'manager' ? payload.role : 'user');
    case 'scheduling':
      return tenant.createSchedule(current, {
        userId: payload.userId,
        startTime: payload.startTime,
        endTime: payload.endTime,
        shiftType: payload.shiftType === 'travel' ? 'travel' : 'regular',
        notes: payload.notes,
      });
    case 'incidents':
      return tenant.createIncident(current, {
        title: payload.title,
        description: payload.description,
        locationLabel: payload.locationLabel,
      });
    case 'attendance':
      if (payload.intent === 'geofence') {
        return tenant.saveGeofence(current, {
          name: payload.name,
          lat: Number(payload.lat),
          lng: Number(payload.lng),
          radiusMeters: Number(payload.radiusMeters),
        });
      }
      if (payload.intent === 'travel') {
        return tenant.grantTravelDay(current, {
          userId: payload.userId,
          workDate: payload.workDate,
          reason: payload.reason,
        });
      }
      return tenant.clockIn(current, {
        lat: payload.lat ? Number(payload.lat) : undefined,
        lng: payload.lng ? Number(payload.lng) : undefined,
      });
    case 'health':
      return tenant.addStaffHealthEvent(current, {
        userId: payload.userId,
        kind: payload.kind === 'late' || payload.kind === 'proof_rejected' || payload.kind === 'complete' ? payload.kind : 'miss',
        note: payload.note,
      });
    case 'wallet':
      if (payload.intent === 'topup') return tenant.walletTopUp(current);
      return tenant.walletAdjustment(current, Number(payload.amountCents), payload.direction === 'debit' ? 'debit' : 'credit', payload.memo);
    case 'pos':
      return tenant.createOrder(current, {
        tableLabel: payload.tableLabel,
        items: payload.itemName ? [{ name: payload.itemName, qty: Number(payload.qty || 1) }] : [],
        totalCents: Number(payload.totalCents || 0),
      });
    case 'cctv':
      return tenant.createCamera(current, { name: payload.name, siteLabel: payload.siteLabel });
    case 'find':
      return tenant.recordLocation(current, {
        lat: Number(payload.lat),
        lng: Number(payload.lng),
        consent: payload.consent === 'true',
      });
    case 'notifications':
      return tenant.markNotificationRead(current, payload.id);
    case 'settings':
      return tenant.updateCompanySettings(current, { name: payload.name, region: payload.region });
    default:
      throw new PlatformError('invalid', 'Nothing to save on this screen.', 400);
  }
}
