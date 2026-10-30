export const DEFAULT_PLATFORM_OWNER_EMAIL = 'thoufeeq2009@gmail.com';
export const HQ_COMPANY_SLUG = 'todo-app-hq';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePlatformOwnerEmails(raw: string | undefined | null): string[] {
  if (raw == null || raw.trim() === '') return [DEFAULT_PLATFORM_OWNER_EMAIL];
  const emails = raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0 && part.length <= 255 && EMAIL_SHAPE.test(part));
  return emails.length > 0 ? [...new Set(emails)] : [DEFAULT_PLATFORM_OWNER_EMAIL];
}

export function platformOwnerEmails(env: NodeJS.ProcessEnv = process.env): readonly string[] {
  return parsePlatformOwnerEmails(env.PLATFORM_OWNER_EMAILS);
}

export interface OwnerClaim {
  email: string;
  role: string;
  companySlug: string | null;
}

export function isPlatformOwner(claim: OwnerClaim, emails: readonly string[] = platformOwnerEmails()): boolean {
  const email = claim.email.trim().toLowerCase();
  if (email && emails.includes(email)) return true;
  return claim.role === 'admin' && claim.companySlug === HQ_COMPANY_SLUG;
}

export interface OwnerSession {
  userId: string;
  email: string;
  role: string;
  companyId: string;
}

export interface OwnerIdentity extends OwnerSession {
  companySlug: string | null;
}

export type OwnerAuth =
  | { ok: true; owner: OwnerIdentity }
  | { ok: false; status: 401 | 403; code: 'unauthorized' | 'forbidden'; message: string };

export function authorizeOwner(
  session: OwnerSession | null,
  companySlug: string | null,
  emails?: readonly string[],
): OwnerAuth {
  if (!session?.userId || !session.email || !session.companyId) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Not authenticated.' };
  }
  if (!isPlatformOwner({ email: session.email, role: session.role, companySlug }, emails)) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      message: 'Platform owner access is required.',
    };
  }
  return {
    ok: true,
    owner: {
      userId: session.userId,
      email: session.email.trim().toLowerCase(),
      role: session.role,
      companyId: session.companyId,
      companySlug,
    },
  };
}
