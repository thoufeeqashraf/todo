'use server';

import { revalidatePath } from 'next/cache';

import { requireCustomerSession } from '@/lib/customer-session';
import { PlatformError } from '@/lib/platform-error';
import { assertModule, type TenantActor, writeAudit } from '@/lib/services/tenant';
import * as tenant from '@/lib/services/tenant';
import { supabaseAdmin } from '@/lib/supabase';

type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function actor(): Promise<TenantActor> {
  const session = await requireCustomerSession();
  return {
    userId: session.user.id,
    companyId: session.companyId,
    role: session.user.role,
    email: session.user.email,
  };
}

function pack(error: unknown): ActionResult {
  if (error instanceof PlatformError) return { ok: false, error: error.message };
  if (error instanceof Error && error.message === 'Not authenticated') {
    return { ok: false, error: 'Sign in again.' };
  }
  console.error(error);
  return { ok: false, error: 'Something went wrong.' };
}

function saved(path: string, message?: string): ActionResult {
  revalidatePath(path);
  return { ok: true, message };
}

export async function createIncidentAction(input: {
  title: string;
  description: string;
  locationLabel: string;
}): Promise<ActionResult> {
  try {
    const title = input.title.trim();
    if (!title) return { ok: false, error: 'Add a title.' };
    if (title.length > 255) return { ok: false, error: 'Title is too long.' };
    const current = await actor();
    await tenant.createIncident(current, {
      title,
      description: input.description.trim(),
      locationLabel: input.locationLabel.trim(),
    });
    return saved('/customer/incidents', 'Incident reported');
  } catch (error) {
    return pack(error);
  }
}

export async function clockInAction(input: { lat: number; lng: number }): Promise<ActionResult> {
  try {
    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
      return { ok: false, error: 'Enter a latitude and longitude. Map lookup is not connected.' };
    }
    const current = await actor();
    const result = await tenant.clockIn(current, input);
    revalidatePath('/customer/attendance');
    if (!result.allowed) {
      const distance =
        result.distanceMeters === null ? '' : ` Distance is ${Math.round(result.distanceMeters)} m.`;
      if (result.reason === 'outside_geofence') {
        return { ok: false, error: `Clock-in refused. Those coordinates are outside the geofence.${distance}` };
      }
      if (result.reason === 'no_geofence') {
        return { ok: false, error: 'An admin needs to save a geofence before clock-in.' };
      }
      return { ok: false, error: 'Clock-in needs coordinates. Map lookup is not connected.' };
    }
    return { ok: true, message: 'Clocked in' };
  } catch (error) {
    return pack(error);
  }
}

export async function clockOutAction(): Promise<ActionResult> {
  try {
    const current = await actor();
    await assertModule(current, 'geofence_attendance');
    const open = await supabaseAdmin
      .from('attendance')
      .select('id')
      .eq('company_id', current.companyId)
      .eq('user_id', current.userId)
      .eq('status', 'clocked_in')
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open.error) {
      console.error('Could not read the open clock-in.', open.error.message);
      return { ok: false, error: 'Could not read the open clock-in.' };
    }
    if (!open.data) return { ok: false, error: 'There is no open clock-in to close.' };
    const id = String((open.data as { id: string }).id);
    const update = await supabaseAdmin
      .from('attendance')
      .update({ clock_out: new Date().toISOString(), status: 'clocked_out' })
      .eq('id', id)
      .eq('company_id', current.companyId)
      .eq('user_id', current.userId);
    if (update.error) {
      console.error('Could not record clock-out.', update.error.message);
      return { ok: false, error: 'Could not record clock-out.' };
    }
    await writeAudit(current, 'attendance.clock_out', 'attendance', id, {});
    return saved('/customer/attendance', 'Clocked out');
  } catch (error) {
    return pack(error);
  }
}

export async function saveGeofenceAction(input: {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}): Promise<ActionResult> {
  try {
    const name = input.name.trim();
    if (!name) return { ok: false, error: 'Name the geofence.' };
    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
      return { ok: false, error: 'Enter the centre as numbers. Map lookup is not connected.' };
    }
    if (!Number.isInteger(input.radiusMeters) || input.radiusMeters <= 0) {
      return { ok: false, error: 'Radius must be a positive number of metres.' };
    }
    const current = await actor();
    await tenant.saveGeofence(current, { name, lat: input.lat, lng: input.lng, radiusMeters: input.radiusMeters });
    return saved('/customer/attendance', 'Geofence saved');
  } catch (error) {
    return pack(error);
  }
}

export async function grantTravelAction(input: {
  userId: string;
  workDate: string;
  reason: string;
}): Promise<ActionResult> {
  try {
    if (!input.userId) return { ok: false, error: 'Choose a person.' };
    if (!input.workDate) return { ok: false, error: 'Choose a work date.' };
    const current = await actor();
    await tenant.grantTravelDay(current, {
      userId: input.userId,
      workDate: input.workDate,
      reason: input.reason.trim(),
    });
    return saved('/customer/attendance', 'Travel day saved');
  } catch (error) {
    return pack(error);
  }
}

export async function recordHealthAction(input: {
  userId: string;
  kind: string;
  note: string;
}): Promise<ActionResult> {
  try {
    if (!input.userId) return { ok: false, error: 'Choose a person.' };
    const kind =
      input.kind === 'late' || input.kind === 'proof_rejected' || input.kind === 'complete' ? input.kind : 'miss';
    const current = await actor();
    await tenant.addStaffHealthEvent(current, { userId: input.userId, kind, note: input.note.trim() });
    return saved('/customer/health', 'Health event recorded');
  } catch (error) {
    return pack(error);
  }
}

export async function adjustWalletAction(input: {
  amountCents: number;
  direction: string;
  memo: string;
}): Promise<ActionResult> {
  try {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return { ok: false, error: 'Amount must be a positive number of cents.' };
    }
    const direction = input.direction === 'debit' ? 'debit' : 'credit';
    const current = await actor();
    await tenant.walletAdjustment(current, input.amountCents, direction, input.memo.trim());
    return saved('/customer/wallet', 'Ledger line posted');
  } catch (error) {
    return pack(error);
  }
}

export async function topUpWalletAction(): Promise<ActionResult> {
  try {
    const current = await actor();
    const stub = await tenant.walletTopUp(current);
    revalidatePath('/customer/wallet');
    return { ok: true, message: stub.message };
  } catch (error) {
    return pack(error);
  }
}

export async function shareLocationAction(input: {
  lat: number;
  lng: number;
  consent: boolean;
}): Promise<ActionResult> {
  try {
    if (input.consent !== true) {
      return { ok: false, error: 'Location is stored only when consent is on.' };
    }
    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
      return { ok: false, error: 'Enter coordinates. Map lookup is not connected.' };
    }
    const current = await actor();
    await tenant.recordLocation(current, { lat: input.lat, lng: input.lng, consent: true });
    return saved('/customer/find-my-staff', 'Location stored');
  } catch (error) {
    return pack(error);
  }
}

export async function createOrderAction(input: {
  tableLabel: string;
  itemName: string;
  qty: number;
  totalCents: number;
}): Promise<ActionResult> {
  try {
    const tableLabel = input.tableLabel.trim();
    if (!tableLabel) return { ok: false, error: 'Add a table.' };
    if (!Number.isInteger(input.totalCents) || input.totalCents < 0) {
      return { ok: false, error: 'Total must be zero or a positive number of cents.' };
    }
    const qty = Number.isInteger(input.qty) && input.qty > 0 ? input.qty : 1;
    const itemName = input.itemName.trim();
    const current = await actor();
    await tenant.createOrder(current, {
      tableLabel,
      items: itemName ? [{ name: itemName, qty }] : [],
      totalCents: input.totalCents,
    });
    return saved('/customer/pos', 'Order opened. Payment stays unpaid.');
  } catch (error) {
    return pack(error);
  }
}

export async function createCameraAction(input: { name: string; siteLabel: string }): Promise<ActionResult> {
  try {
    const name = input.name.trim();
    if (!name) return { ok: false, error: 'Name the camera.' };
    const current = await actor();
    await tenant.createCamera(current, { name, siteLabel: input.siteLabel.trim() });
    return saved('/customer/cctv', 'Camera registered. No stream is connected.');
  } catch (error) {
    return pack(error);
  }
}
