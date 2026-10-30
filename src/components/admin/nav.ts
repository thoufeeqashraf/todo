export const adminRoutes = [
  {
    href: '/customer/audit',
    label: 'Audit log',
    description: 'Search and filter this company’s audit trail.',
    adminOnly: true,
  },
  {
    href: '/customer/team',
    label: 'Team',
    description: 'Members, roles, and invitations.',
    adminOnly: true,
  },
  {
    href: '/customer/billing',
    label: 'Billing',
    description: 'Plan, usage, and invoices. Not connected to a payment provider.',
    adminOnly: true,
  },
] as const;

export type AdminRoute = (typeof adminRoutes)[number];
