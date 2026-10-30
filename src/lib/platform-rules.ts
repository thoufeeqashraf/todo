/**
 * Server and client-safe business rules.
 * Web and the future mobile client must both go through these rules.
 * External providers are explicit stubs: they never move money or open a stream.
 */

export type UserRole = 'admin' | 'manager' | 'user';

export type ModuleName =
  | 'tasks'
  | 'staff'
  | 'scheduling'
  | 'inventory'
  | 'sales'
  | 'maintenance'
  | 'projects'
  | 'equipment'
  | 'housekeeping'
  | 'patients'
  | 'deliveries'
  | 'fleet'
  | 'production'
  | 'quality'
  | 'classes'
  | 'incidents'
  | 'patrol'
  | 'crops'
  | 'events'
  | 'appointments'
  | 'members'
  | 'properties'
  | 'clients'
  | 'volunteers'
  | 'children'
  | 'parents'
  | 'orders'
  | 'reports'
  | 'notifications'
  | 'staff_health'
  | 'geofence_attendance'
  | 'find_my_staff'
  | 'wallet'
  | 'mini_apps'
  | 'pos'
  | 'cctv';

export type ProviderState = 'stub' | 'not_connected' | 'ready';

export interface ProviderDescriptor {
  name: string;
  state: ProviderState;
  movesMoney: boolean;
  message: string;
}

export const PROVIDERS: Record<'payments' | 'maps' | 'cctv' | 'email', ProviderDescriptor> = {
  payments: {
    name: 'transaction_junction',
    state: 'stub',
    movesMoney: false,
    message:
      'Transaction Junction is not connected. Top-up, payout, and QR pay do not move money.',
  },
  maps: {
    name: 'none',
    state: 'stub',
    movesMoney: false,
    message: 'No map provider is connected. Coordinates are stored as numbers only.',
  },
  cctv: {
    name: 'none',
    state: 'stub',
    movesMoney: false,
    message: 'No CCTV provider is connected. Cameras are a registry without a live stream.',
  },
  email: {
    name: 'none',
    state: 'stub',
    movesMoney: false,
    message: 'Email delivery is not connected. Invitation links must be copied by an admin.',
  },
};

/** Provisional until the kickoff lock in DECISIONS.md. Not an AI model. */
export const STAFF_HEALTH_WEIGHTS = {
  miss: 15,
  late: 5,
  proofRejected: 8,
  completeBonusCap: 20,
} as const;

export const INDUSTRY_LABELS: Record<
  string,
  { task: string; staff: string; site: string; checklists: { name: string; items: string[] }[] }
> = {
  restaurant: {
    task: 'Shift task',
    staff: 'Crew',
    site: 'Venue',
    checklists: [
      { name: 'Opening', items: ['Unlock and lights', 'Equipment temps', 'Station mise en place'] },
      { name: 'Closing', items: ['Clean stations', 'Waste log', 'Lockup'] },
    ],
  },
  retail: {
    task: 'Floor task',
    staff: 'Associates',
    site: 'Store',
    checklists: [
      { name: 'Opening', items: ['Safe count', 'Floor recovery', 'Price check'] },
      { name: 'Closing', items: ['Cash-up', 'Alarm', 'Delivery log'] },
    ],
  },
  property: {
    task: 'Work order',
    staff: 'Site team',
    site: 'Property',
    checklists: [
      { name: 'Inspection', items: ['Common areas', 'Access control', 'Open maintenance'] },
    ],
  },
  construction: {
    task: 'Site task',
    staff: 'Crew',
    site: 'Job site',
    checklists: [
      { name: 'Daily start', items: ['Toolbox talk', 'PPE check', 'Permit review'] },
    ],
  },
};

export function industryLabels(industryName: string | null | undefined) {
  if (!industryName) {
    return { task: 'Task', staff: 'Staff', site: 'Site', checklists: [] as { name: string; items: string[] }[] };
  }
  return (
    INDUSTRY_LABELS[industryName] ?? {
      task: 'Task',
      staff: 'Staff',
      site: 'Site',
      checklists: [],
    }
  );
}

const RANK: Record<UserRole, number> = { user: 1, manager: 2, admin: 3 };

export function isUserRole(value: string): value is UserRole {
  return value === 'admin' || value === 'manager' || value === 'user';
}

export function canToggleModules(role: UserRole) {
  return role === 'admin';
}

export function canViewAudit(role: UserRole) {
  return role === 'admin';
}

export function canManagePeople(role: UserRole) {
  return RANK[role] >= RANK.manager;
}

export function canViewStaffHealth(role: UserRole) {
  return role !== 'user';
}

export function canAssignToOthers(role: UserRole) {
  return role !== 'user';
}

export function canSeeCompanyTasks(role: UserRole) {
  return role !== 'user';
}

export function moduleEnabled(enabled: Iterable<string>, name: string) {
  for (const item of enabled) {
    if (item === name) return true;
  }
  return false;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Geofence {
  lat: number;
  lng: number;
  radiusMeters: number;
}

export type ClockInDecision = {
  allowed: boolean;
  reason: 'inside_geofence' | 'travel_day' | 'manual_approved' | 'outside_geofence' | 'missing_location' | 'no_geofence';
  distanceMeters: number | null;
};

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const earth = 6371000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function decideClockIn(input: {
  point: GeoPoint | null;
  fence: Geofence | null;
  travelDay: boolean;
  manualApproved: boolean;
}): ClockInDecision {
  if (input.travelDay) {
    return { allowed: true, reason: 'travel_day', distanceMeters: null };
  }
  if (input.manualApproved) {
    return { allowed: true, reason: 'manual_approved', distanceMeters: null };
  }
  if (!input.fence) {
    return { allowed: false, reason: 'no_geofence', distanceMeters: null };
  }
  if (!input.point || !Number.isFinite(input.point.lat) || !Number.isFinite(input.point.lng)) {
    return { allowed: false, reason: 'missing_location', distanceMeters: null };
  }
  const distanceMeters = haversineMeters(input.point, input.fence);
  if (distanceMeters <= input.fence.radiusMeters) {
    return { allowed: true, reason: 'inside_geofence', distanceMeters };
  }
  return { allowed: false, reason: 'outside_geofence', distanceMeters };
}

export function staffHealthScore(input: {
  misses: number;
  late: number;
  proofRejected: number;
  completed: number;
}): { score: number; band: 'good' | 'watch' | 'poor'; weights: typeof STAFF_HEALTH_WEIGHTS; provisional: true } {
  const raw =
    100 -
    input.misses * STAFF_HEALTH_WEIGHTS.miss -
    input.late * STAFF_HEALTH_WEIGHTS.late -
    input.proofRejected * STAFF_HEALTH_WEIGHTS.proofRejected +
    Math.min(input.completed, STAFF_HEALTH_WEIGHTS.completeBonusCap);
  const score = Math.max(0, Math.min(100, raw));
  const band = score >= 80 ? 'good' : score >= 50 ? 'watch' : 'poor';
  return { score, band, weights: STAFF_HEALTH_WEIGHTS, provisional: true };
}

export interface LedgerEntry {
  amountCents: number;
  direction: 'credit' | 'debit';
}

export function ledgerBalanceCents(entries: LedgerEntry[]): number {
  return entries.reduce((sum, entry) => {
    if (!Number.isInteger(entry.amountCents) || entry.amountCents < 0) {
      throw new Error('Ledger amounts must be non-negative integers.');
    }
    return sum + (entry.direction === 'credit' ? entry.amountCents : -entry.amountCents);
  }, 0);
}

export function transactionJunctionTopUp(): {
  provider: 'transaction_junction';
  state: 'stub';
  movedMoney: false;
  message: string;
} {
  return {
    provider: 'transaction_junction',
    state: 'stub',
    movedMoney: false,
    message: PROVIDERS.payments.message,
  };
}

export function cameraStream(provider: string | null): {
  state: 'stub';
  streamUrl: null;
  provider: string;
  message: string;
} {
  return {
    state: 'stub',
    streamUrl: null,
    provider: provider || 'unconfigured',
    message: PROVIDERS.cctv.message,
  };
}

export function mapProviderStatus() {
  return { ...PROVIDERS.maps, tileUrl: null as null };
}

export const API_VERSION = 'v1';

export const API_V1_CATALOG = [
  { method: 'POST', path: '/api/v1/auth/login', auth: 'none', module: null },
  { method: 'POST', path: '/api/v1/invitations/accept', auth: 'none', module: 'staff' },
  { method: 'GET', path: '/api/v1/health', auth: 'none', module: null },
  { method: 'GET', path: '/api/v1/bootstrap', auth: 'bearer', module: null },
  { method: 'GET', path: '/api/v1/tasks', auth: 'bearer', module: 'tasks' },
  { method: 'POST', path: '/api/v1/tasks', auth: 'bearer', module: 'tasks' },
  { method: 'GET', path: '/api/v1/users', auth: 'bearer', module: 'staff' },
  { method: 'POST', path: '/api/v1/invitations', auth: 'bearer', module: 'staff' },
  { method: 'GET', path: '/api/v1/departments', auth: 'bearer', module: 'staff' },
  { method: 'POST', path: '/api/v1/departments', auth: 'bearer', module: 'staff' },
  { method: 'GET', path: '/api/v1/notifications', auth: 'bearer', module: 'notifications' },
  { method: 'POST', path: '/api/v1/notifications/read', auth: 'bearer', module: 'notifications' },
  { method: 'GET', path: '/api/v1/audit', auth: 'bearer', module: null },
  { method: 'GET', path: '/api/v1/incidents', auth: 'bearer', module: 'incidents' },
  { method: 'POST', path: '/api/v1/incidents', auth: 'bearer', module: 'incidents' },
  { method: 'GET', path: '/api/v1/schedules', auth: 'bearer', module: 'scheduling' },
  { method: 'POST', path: '/api/v1/schedules', auth: 'bearer', module: 'scheduling' },
  { method: 'POST', path: '/api/v1/geofences', auth: 'bearer', module: 'geofence_attendance' },
  { method: 'POST', path: '/api/v1/attendance/travel-day', auth: 'bearer', module: 'geofence_attendance' },
  { method: 'POST', path: '/api/v1/attendance/clock-in', auth: 'bearer', module: 'geofence_attendance' },
  { method: 'GET', path: '/api/v1/staff-health', auth: 'bearer', module: 'staff_health' },
  { method: 'POST', path: '/api/v1/staff-health', auth: 'bearer', module: 'staff_health' },
  { method: 'GET', path: '/api/v1/wallet', auth: 'bearer', module: 'wallet' },
  { method: 'POST', path: '/api/v1/wallet/adjustment', auth: 'bearer', module: 'wallet' },
  { method: 'POST', path: '/api/v1/wallet/top-up', auth: 'bearer', module: 'wallet' },
  { method: 'GET', path: '/api/v1/pos/orders', auth: 'bearer', module: 'pos' },
  { method: 'POST', path: '/api/v1/pos/orders', auth: 'bearer', module: 'pos' },
  { method: 'GET', path: '/api/v1/cctv/cameras', auth: 'bearer', module: 'cctv' },
  { method: 'POST', path: '/api/v1/cctv/cameras', auth: 'bearer', module: 'cctv' },
  { method: 'GET', path: '/api/v1/mini-apps', auth: 'bearer', module: 'mini_apps' },
  { method: 'GET', path: '/api/v1/locations', auth: 'bearer', module: 'find_my_staff' },
  { method: 'POST', path: '/api/v1/locations', auth: 'bearer', module: 'find_my_staff' },
  { method: 'GET', path: '/api/v1/reports/summary', auth: 'bearer', module: 'reports' },
  { method: 'GET', path: '/api/v1/onboarding', auth: 'bearer', module: null },
  { method: 'GET', path: '/api/v1/settings', auth: 'bearer', module: null },
  { method: 'PATCH', path: '/api/v1/settings', auth: 'bearer', module: null },
  { method: 'POST', path: '/api/v1/auth/logout', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'GET', path: '/api/v1/auth/me', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'GET', path: '/api/v1/tasks/:id', auth: 'bearer', module: 'tasks', minRole: 'user' },
  { method: 'PATCH', path: '/api/v1/tasks/:id', auth: 'bearer', module: 'tasks', minRole: 'user' },
  { method: 'DELETE', path: '/api/v1/tasks/:id', auth: 'bearer', module: 'tasks', minRole: 'manager' },
  { method: 'GET', path: '/api/v1/staff', auth: 'bearer', module: 'staff', minRole: 'user' },
  { method: 'GET', path: '/api/v1/staff/:id', auth: 'bearer', module: 'staff', minRole: 'user' },
  { method: 'PATCH', path: '/api/v1/staff/:id', auth: 'bearer', module: 'staff', minRole: 'manager' },
  { method: 'GET', path: '/api/v1/users/:id', auth: 'bearer', module: 'staff', minRole: 'user' },
  { method: 'PATCH', path: '/api/v1/users/:id', auth: 'bearer', module: 'staff', minRole: 'manager' },
  { method: 'GET', path: '/api/v1/schedules/:id', auth: 'bearer', module: 'scheduling', minRole: 'user' },
  { method: 'PATCH', path: '/api/v1/schedules/:id', auth: 'bearer', module: 'scheduling', minRole: 'manager' },
  { method: 'DELETE', path: '/api/v1/schedules/:id', auth: 'bearer', module: 'scheduling', minRole: 'manager' },
  { method: 'GET', path: '/api/v1/attendance', auth: 'bearer', module: 'geofence_attendance', minRole: 'user' },
  { method: 'POST', path: '/api/v1/attendance/clock-out', auth: 'bearer', module: 'geofence_attendance', minRole: 'user' },
  { method: 'GET', path: '/api/v1/incidents/:id', auth: 'bearer', module: 'incidents', minRole: 'user' },
  { method: 'PATCH', path: '/api/v1/incidents/:id', auth: 'bearer', module: 'incidents', minRole: 'manager' },
  { method: 'GET', path: '/api/v1/wallet/entries', auth: 'bearer', module: 'wallet', minRole: 'user' },
  { method: 'POST', path: '/api/v1/notifications/read-all', auth: 'bearer', module: 'notifications', minRole: 'user' },
  { method: 'GET', path: '/api/v1/owner/overview', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'GET', path: '/api/v1/owner/tenants', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'POST', path: '/api/v1/owner/tenants', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'GET', path: '/api/v1/owner/tenants/:id', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'PATCH', path: '/api/v1/owner/tenants/:id', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'GET', path: '/api/v1/owner/tenants/:id/audit', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'PATCH', path: '/api/v1/owner/tenants/:id/modules', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'POST', path: '/api/v1/owner/tenants/:id/invitations', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'GET', path: '/api/v1/owner/industries', auth: 'bearer', module: null, minRole: 'user' },
  { method: 'GET', path: '/api/v1/owner/modules', auth: 'bearer', module: null, minRole: 'user' },
] as const;

/** Routes whose catalogue row has no minRole still require this floor. */
export const API_ROLE_FLOOR: Record<string, 'manager' | 'admin'> = {
  'POST /api/v1/departments': 'manager',
  'POST /api/v1/invitations': 'manager',
  'GET /api/v1/audit': 'admin',
  'POST /api/v1/schedules': 'manager',
  'POST /api/v1/geofences': 'admin',
  'POST /api/v1/attendance/travel-day': 'manager',
  'GET /api/v1/staff-health': 'manager',
  'POST /api/v1/staff-health': 'manager',
  'POST /api/v1/wallet/adjustment': 'admin',
  'POST /api/v1/cctv/cameras': 'manager',
  'PATCH /api/v1/settings': 'admin',
};

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ApiCatalogRoute = (typeof API_V1_CATALOG)[number];

export function matchApiRoute(method: string, parts: readonly string[]): ApiCatalogRoute | null {
  if (parts.length === 0 || parts.some((part) => part.length === 0)) return null;
  const normalized = parts.map((part) => (UUID_SEGMENT.test(part) ? ':id' : part));
  const path = `/api/v1/${normalized.join('/')}`;
  return API_V1_CATALOG.find((route) => route.method === method && route.path === path) ?? null;
}

export function routeMinRole(route: { method: string; path: string; minRole?: 'user' | 'manager' | 'admin' }): 'user' | 'manager' | 'admin' {
  if ('minRole' in route && route.minRole) return route.minRole;
  return API_ROLE_FLOOR[`${route.method} ${route.path}`] ?? 'user';
}

export type GateDecision =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string; module?: string };

export function gateApiRoute(
  route: { auth: string; module: string | null; method: string; path: string; minRole?: 'user' | 'manager' | 'admin' },
  actor: { role: UserRole } | null,
  enabled: Iterable<string>,
): GateDecision {
  if (route.auth === 'none') return { ok: true };
  if (!actor || !isUserRole(actor.role)) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Bearer token is missing or expired.' };
  }
  if (route.module && !moduleEnabled(enabled, route.module)) {
    return {
      ok: false,
      status: 403,
      code: 'module_disabled',
      message: `The ${route.module} module is off for this company.`,
      module: route.module,
    };
  }
  const minRole = routeMinRole(route);
  if (RANK[actor.role] < RANK[minRole]) {
    return { ok: false, status: 403, code: 'forbidden', message: 'You do not have permission for this route.' };
  }
  return { ok: true };
}
