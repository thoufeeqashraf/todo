export type DirectoryPerson = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
};

export type IncidentRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  location_label: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
};

export type AttendanceRow = {
  id: string;
  user_id: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_location: unknown;
  status: string;
  notes: string | null;
  created_at: string;
};

export type GeofenceRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  active: boolean;
};

export type TravelRow = {
  id: string;
  user_id: string;
  work_date: string;
  reason: string | null;
  approved_by: string | null;
};

export type HealthEventRow = {
  id: string;
  user_id: string;
  kind: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type HealthScoreRow = {
  userId: string;
  misses: number;
  late: number;
  proofRejected: number;
  completed: number;
  score: number;
  band: 'good' | 'watch' | 'poor';
};

export type WalletAccountRow = {
  id: string;
  user_id: string;
  currency: string;
  created_at: string;
  balanceCents: number;
  entryCount: number;
};

export type WalletEntryRow = {
  id: string;
  account_id: string;
  user_id: string;
  amount_cents: number;
  direction: string;
  source: string;
  memo: string | null;
  created_at: string;
  currency: string;
};

export type LocationRow = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  consent: boolean;
  source: string;
};

export type OrderRow = {
  id: string;
  table_label: string;
  status: string;
  items: unknown;
  total_cents: number;
  payment_status: string;
  created_by: string | null;
  created_at: string;
};

export type CameraRow = {
  id: string;
  name: string;
  site_label: string | null;
  provider: string;
  external_ref: string | null;
  created_at: string;
  streamMessage: string;
};

export type IncidentsData = {
  incidents: IncidentRow[];
  people: DirectoryPerson[];
  scope: string;
};

export type AttendanceData = {
  rows: AttendanceRow[];
  geofences: GeofenceRow[];
  travel: TravelRow[];
  people: DirectoryPerson[];
  scope: string;
  canManageGeofence: boolean;
  canGrantTravel: boolean;
};

export type HealthData = {
  events: HealthEventRow[];
  scores: HealthScoreRow[];
  people: DirectoryPerson[];
};

export type WalletData = {
  accounts: WalletAccountRow[];
  entries: WalletEntryRow[];
  people: DirectoryPerson[];
  canAdjust: boolean;
  balanceCents: number;
  currency: string;
};

export type FindStaffData = {
  locations: LocationRow[];
  geofences: GeofenceRow[];
  people: DirectoryPerson[];
  mapMessage: string;
  geofenceModuleOn: boolean;
  viewerId: string;
  canSeeCompany: boolean;
};

export type PosData = {
  orders: OrderRow[];
  people: DirectoryPerson[];
};

export type CctvData = {
  cameras: CameraRow[];
  canRegister: boolean;
  streamMessage: string;
};
