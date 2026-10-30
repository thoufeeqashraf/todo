import 'server-only';

import { redirect } from 'next/navigation';

import type {
  AttendanceRow,
  CameraRow,
  DirectoryPerson,
  GeofenceRow,
  HealthEventRow,
  IncidentRow,
  LocationRow,
  OrderRow,
  TravelRow,
  WalletAccountRow,
  WalletEntryRow,
} from '@/components/modules/types';
import { getCustomerSession } from '@/lib/customer-session';
import { PlatformError } from '@/lib/platform-error';
import {
  cameraStream,
  canManagePeople,
  canSeeCompanyTasks,
  canToggleModules,
  canViewStaffHealth,
  ledgerBalanceCents,
  mapProviderStatus,
  staffHealthScore,
} from '@/lib/platform-rules';
import { assertModule, type TenantActor } from '@/lib/services/tenant';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

const NOT_CONFIGURED =
  'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then apply migrations 001–003.';

export type Gate = { ok: true; actor: TenantActor } | { ok: false; body: string };

export async function readModule<T>(work: () => Promise<T>): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    return { data: await work(), error: null };
  } catch (error) {
    if (error instanceof Error) return { data: null, error: error.message };
    return { data: null, error: 'Could not read this module.' };
  }
}

export async function gateModule(moduleName: string): Promise<Gate> {
  const session = await getCustomerSession();
  if (!session) redirect('/customer-login');
  const actor: TenantActor = {
    userId: session.user.id,
    companyId: session.companyId,
    role: session.user.role,
    email: session.user.email,
  };
  if (!isSupabaseConfigured()) return { ok: false, body: NOT_CONFIGURED };
  try {
    await assertModule(actor, moduleName);
    return { ok: true, actor };
  } catch (error) {
    if (error instanceof PlatformError) return { ok: false, body: error.message };
    console.error(error);
    return { ok: false, body: 'This module could not be opened.' };
  }
}

async function directory(companyId: string): Promise<DirectoryPerson[]> {
  const result = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, email, role')
    .eq('company_id', companyId)
    .order('first_name');
  if (result.error) {
    console.error('Could not read people.', result.error.message);
    return [];
  }
  return (result.data ?? []) as DirectoryPerson[];
}

function readFailed(message: string, detail: string): never {
  console.error(message, detail);
  throw new Error(message);
}

export async function loadIncidents(actor: TenantActor) {
  const query = supabaseAdmin
    .from('incidents')
    .select('id, title, description, status, location_label, reported_by, assigned_to, created_at')
    .eq('company_id', actor.companyId)
    .order('created_at', { ascending: false })
    .limit(200);
  const [result, people] = await Promise.all([
    canSeeCompanyTasks(actor.role) ? query : query.eq('reported_by', actor.userId),
    directory(actor.companyId),
  ]);
  if (result.error) readFailed('Could not read incidents.', result.error.message);
  return {
    incidents: (result.data ?? []) as IncidentRow[],
    people,
    scope: canSeeCompanyTasks(actor.role) ? 'This company' : 'Reported by you',
  };
}

export async function loadAttendance(actor: TenantActor) {
  const companyWide = canSeeCompanyTasks(actor.role);
  const attendanceQuery = supabaseAdmin
    .from('attendance')
    .select('id, user_id, clock_in, clock_out, clock_in_location, status, notes, created_at')
    .eq('company_id', actor.companyId)
    .order('created_at', { ascending: false })
    .limit(200);
  const travelQuery = supabaseAdmin
    .from('travel_exceptions')
    .select('id, user_id, work_date, reason, approved_by')
    .eq('company_id', actor.companyId)
    .order('work_date', { ascending: false })
    .limit(100);
  const [attendanceResult, fenceResult, travelResult, people] = await Promise.all([
    companyWide ? attendanceQuery : attendanceQuery.eq('user_id', actor.userId),
    supabaseAdmin
      .from('geofences')
      .select('id, name, latitude, longitude, radius_meters, active')
      .eq('company_id', actor.companyId)
      .order('name'),
    companyWide ? travelQuery : travelQuery.eq('user_id', actor.userId),
    directory(actor.companyId),
  ]);
  if (attendanceResult.error) readFailed('Could not read attendance.', attendanceResult.error.message);
  if (fenceResult.error) readFailed('Could not read geofences.', fenceResult.error.message);
  if (travelResult.error) readFailed('Could not read travel days.', travelResult.error.message);
  return {
    rows: (attendanceResult.data ?? []) as AttendanceRow[],
    geofences: (fenceResult.data ?? []) as GeofenceRow[],
    travel: (travelResult.data ?? []) as TravelRow[],
    people,
    scope: companyWide ? 'This company' : 'Your clock events',
    canManageGeofence: canToggleModules(actor.role),
    canGrantTravel: canManagePeople(actor.role),
  };
}

export async function loadHealth(actor: TenantActor) {
  if (!canViewStaffHealth(actor.role)) {
    throw new Error('Staff health is visible only to managers and admins.');
  }
  const [result, people] = await Promise.all([
    supabaseAdmin
      .from('staff_health_events')
      .select('id, user_id, kind, note, created_by, created_at')
      .eq('company_id', actor.companyId)
      .order('created_at', { ascending: false })
      .limit(200),
    directory(actor.companyId),
  ]);
  if (result.error) readFailed('Could not read staff health events.', result.error.message);
  const events = (result.data ?? []) as HealthEventRow[];
  const buckets = new Map<string, { misses: number; late: number; proofRejected: number; completed: number }>();
  for (const event of events) {
    const bucket = buckets.get(event.user_id) ?? { misses: 0, late: 0, proofRejected: 0, completed: 0 };
    if (event.kind === 'miss') bucket.misses += 1;
    if (event.kind === 'late') bucket.late += 1;
    if (event.kind === 'proof_rejected') bucket.proofRejected += 1;
    if (event.kind === 'complete') bucket.completed += 1;
    buckets.set(event.user_id, bucket);
  }
  const scores = [...buckets.entries()].map(([userId, counts]) => {
    const scored = staffHealthScore(counts);
    return { userId, ...counts, score: scored.score, band: scored.band };
  });
  return { events, scores, people };
}

function asLedgerDirection(value: string): 'credit' | 'debit' | null {
  if (value === 'credit' || value === 'debit') return value;
  return null;
}

export async function loadWallet(actor: TenantActor) {
  const accountsQuery = supabaseAdmin
    .from('wallet_accounts')
    .select('id, user_id, currency, created_at')
    .eq('company_id', actor.companyId)
    .order('created_at');
  const [accountsResult, people] = await Promise.all([
    actor.role === 'admin' ? accountsQuery : accountsQuery.eq('user_id', actor.userId),
    directory(actor.companyId),
  ]);
  if (accountsResult.error) readFailed('Could not read wallet accounts.', accountsResult.error.message);
  const rawAccounts = (accountsResult.data ?? []) as Array<{
    id: string;
    user_id: string;
    currency: string;
    created_at: string;
  }>;
  const accountIds = rawAccounts.map((account) => account.id);
  let rawEntries: Array<{
    id: string;
    account_id: string;
    amount_cents: number;
    direction: string;
    source: string;
    memo: string | null;
    created_at: string;
  }> = [];
  if (accountIds.length > 0) {
    const entriesResult = await supabaseAdmin
      .from('wallet_entries')
      .select('id, account_id, amount_cents, direction, source, memo, created_at')
      .eq('company_id', actor.companyId)
      .in('account_id', accountIds)
      .order('created_at', { ascending: false })
      .limit(200);
    if (entriesResult.error) readFailed('Could not read wallet entries.', entriesResult.error.message);
    rawEntries = (entriesResult.data ?? []) as typeof rawEntries;
  }
  const byAccount = new Map<string, typeof rawEntries>();
  for (const entry of rawEntries) {
    const list = byAccount.get(entry.account_id) ?? [];
    list.push(entry);
    byAccount.set(entry.account_id, list);
  }
  const accounts: WalletAccountRow[] = rawAccounts.map((account) => {
    const list = byAccount.get(account.id) ?? [];
    const balanceCents = ledgerBalanceCents(
      list.flatMap((entry) => {
        const direction = asLedgerDirection(entry.direction);
        if (!direction || !Number.isInteger(entry.amount_cents) || entry.amount_cents < 0) return [];
        return [{ amountCents: entry.amount_cents, direction }];
      }),
    );
    return { ...account, balanceCents, entryCount: list.length };
  });
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const entries: WalletEntryRow[] = rawEntries.map((entry) => {
    const account = accountById.get(entry.account_id);
    return {
      ...entry,
      user_id: account?.user_id ?? '',
      currency: account?.currency ?? 'ZAR',
    };
  });
  const own = accounts.find((account) => account.user_id === actor.userId);
  return {
    accounts,
    entries,
    people,
    canAdjust: actor.role === 'admin',
    balanceCents: own?.balanceCents ?? 0,
    currency: own?.currency ?? 'ZAR',
  };
}

export async function loadFindStaff(actor: TenantActor) {
  const companyWide = canViewStaffHealth(actor.role);
  const locationQuery = supabaseAdmin
    .from('staff_locations')
    .select('id, user_id, latitude, longitude, recorded_at, consent, source')
    .eq('company_id', actor.companyId)
    .eq('consent', true)
    .order('recorded_at', { ascending: false })
    .limit(100);
  const [locationResult, people] = await Promise.all([
    companyWide ? locationQuery : locationQuery.eq('user_id', actor.userId),
    directory(actor.companyId),
  ]);
  if (locationResult.error) readFailed('Could not read staff locations.', locationResult.error.message);
  let geofences: GeofenceRow[] = [];
  let geofenceModuleOn = false;
  try {
    await assertModule(actor, 'geofence_attendance');
    geofenceModuleOn = true;
    const fenceResult = await supabaseAdmin
      .from('geofences')
      .select('id, name, latitude, longitude, radius_meters, active')
      .eq('company_id', actor.companyId)
      .order('name');
    if (fenceResult.error) readFailed('Could not read geofences.', fenceResult.error.message);
    geofences = (fenceResult.data ?? []) as GeofenceRow[];
  } catch (error) {
    if (error instanceof PlatformError && error.code === 'module_disabled') {
      geofences = [];
      geofenceModuleOn = false;
    } else {
      throw error;
    }
  }
  return {
    locations: (locationResult.data ?? []) as LocationRow[],
    geofences,
    people,
    mapMessage: mapProviderStatus().message,
    geofenceModuleOn,
    viewerId: actor.userId,
    canSeeCompany: companyWide,
  };
}

export async function loadOrders(actor: TenantActor) {
  const [result, people] = await Promise.all([
    supabaseAdmin
      .from('pos_orders')
      .select('id, table_label, status, items, total_cents, payment_status, created_by, created_at')
      .eq('company_id', actor.companyId)
      .order('created_at', { ascending: false })
      .limit(200),
    directory(actor.companyId),
  ]);
  if (result.error) readFailed('Could not read orders.', result.error.message);
  return {
    orders: (result.data ?? []) as OrderRow[],
    people,
  };
}

export async function loadCameras(actor: TenantActor) {
  const result = await supabaseAdmin
    .from('cameras')
    .select('id, name, site_label, provider, external_ref, created_at')
    .eq('company_id', actor.companyId)
    .order('name')
    .limit(200);
  if (result.error) readFailed('Could not read cameras.', result.error.message);
  const rows = (result.data ?? []) as Array<Omit<CameraRow, 'streamMessage'>>;
  const streamMessage = cameraStream(null).message;
  return {
    cameras: rows.map((camera) => ({
      ...camera,
      streamMessage: cameraStream(camera.provider).message,
    })),
    canRegister: canManagePeople(actor.role),
    streamMessage,
  };
}
