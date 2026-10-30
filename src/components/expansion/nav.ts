/**
 * Routes for the default projects, clients, and notifications modules.
 * The customer shell can import this list. Each screen gates on `module`.
 */
export const expansionRoutes = [
  {
    href: '/customer/projects',
    label: 'Projects',
    module: 'projects',
    description: 'Board and list of company tasks, grouped by department.',
  },
  {
    href: '/customer/clients',
    label: 'Clients',
    module: 'clients',
    description: 'Client directory for this company.',
  },
  {
    href: '/customer/notifications',
    label: 'Notifications',
    module: 'notifications',
    description: 'In-app inbox for the signed-in user.',
  },
] as const;

export type ExpansionRoute = (typeof expansionRoutes)[number];
