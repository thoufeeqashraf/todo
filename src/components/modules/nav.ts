/**
 * Routes owned by the premium module screens.
 * The customer shell should link these. Do not duplicate them into the sidebar from this folder.
 */
export type ModuleNavGroup = 'Work' | 'People' | 'Business' | 'Platform';

export type ModuleNavIcon =
  | 'Shield'
  | 'Waypoints'
  | 'HeartPulse'
  | 'MapPin'
  | 'Wallet'
  | 'Store'
  | 'Video';

export type ModuleNavItem = {
  href: string;
  label: string;
  description: string;
  /** `modules.name` checked before the page reads company rows. */
  module: string;
  group: ModuleNavGroup;
  icon: ModuleNavIcon;
  tables: readonly string[];
};

export const moduleNav: readonly ModuleNavItem[] = [
  {
    href: '/customer/incidents',
    label: 'Incidents',
    description: 'Report and review incidents inside this company.',
    module: 'incidents',
    group: 'Work',
    icon: 'Shield',
    tables: ['incidents'],
  },
  {
    href: '/customer/attendance',
    label: 'Attendance',
    description: 'Geofence clock-in and clock-out. Map lookup is not connected.',
    module: 'geofence_attendance',
    group: 'People',
    icon: 'Waypoints',
    tables: ['attendance', 'geofences', 'travel_exceptions'],
  },
  {
    href: '/customer/health',
    label: 'Staff health',
    description: 'Health events and a provisional rules score for managers.',
    module: 'staff_health',
    group: 'People',
    icon: 'HeartPulse',
    tables: ['staff_health_events'],
  },
  {
    href: '/customer/find-my-staff',
    label: 'Find My Staff',
    description: 'Consented coordinates on a schematic plot. No map tiles.',
    module: 'find_my_staff',
    group: 'People',
    icon: 'MapPin',
    tables: ['staff_locations', 'geofences'],
  },
  {
    href: '/customer/wallet',
    label: 'Wallet',
    description: 'Internal ledger. Top-up does not move money.',
    module: 'wallet',
    group: 'Business',
    icon: 'Wallet',
    tables: ['wallet_accounts', 'wallet_entries'],
  },
  {
    href: '/customer/pos',
    label: 'POS',
    description: 'Table orders. Payment capture stays unpaid.',
    module: 'pos',
    group: 'Business',
    icon: 'Store',
    tables: ['pos_orders'],
  },
  {
    href: '/customer/cctv',
    label: 'CCTV',
    description: 'Camera grid with placeholder feeds. No live stream.',
    module: 'cctv',
    group: 'Platform',
    icon: 'Video',
    tables: ['cameras'],
  },
];
