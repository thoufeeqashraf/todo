/** Routes for the public help center and the customer setup checklist. */

export const helpCenterPath = '/help';

export const customerOnboardingPath = '/customer/onboarding';

export function helpArticlePath(slug: string) {
  return `/help/${slug}`;
}

export const helpNavItems = [
  {
    href: helpCenterPath,
    label: 'Help center',
    description: 'Public articles on companies, people, modules, and attendance.',
    audience: 'public',
  },
  {
    href: customerOnboardingPath,
    label: 'Setup checklist',
    description: 'Team, staff invites, modules, geofence, and mobile — from stored company data.',
    audience: 'customer',
  },
] as const;

export type HelpNavItem = (typeof helpNavItems)[number];

/** Screens the setup checklist links to. Kept beside the help routes for other UI. */
export const onboardingActionPaths = {
  staff: '/customer/staff',
  modules: '/customer/modules',
  attendance: '/customer/module/attendance',
  mobileArticle: '/help/connect-mobile',
} as const;
