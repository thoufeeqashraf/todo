import { authorizeOwner } from '@/lib/owner/guard';
import { customerCookieAllows } from '@/lib/request-guards';

export interface OwnerPageClaim {
  userId: string;
  email: string;
  role: string;
  companyId: string;
  companySlug: string | null;
}

export type OwnerPageResolver = (token: string) => Promise<OwnerPageClaim | null>;

/**
 * Status for an /owner document request.
 * A missing or malformed cookie never calls the resolver, so anonymous traffic does not read tenant data.
 */
export async function ownerPageStatus(token: string | undefined, resolve: OwnerPageResolver): Promise<200 | 401 | 403> {
  if (!customerCookieAllows(token)) return 401;
  let claim: OwnerPageClaim | null;
  try {
    claim = await resolve(token as string);
  } catch {
    return 401;
  }
  if (!claim?.userId || !claim.email || !claim.companyId) return 401;
  const auth = authorizeOwner(claim, claim.companySlug);
  return auth.ok ? 200 : auth.status;
}

export function ownerGateDocument(status: 401 | 403): string {
  const signedOut = status === 401;
  const title = signedOut ? 'Sign in required' : 'Platform owner only';
  const body = signedOut
    ? 'The platform console is only available to a signed-in platform owner.'
    : 'This account can run one company. It is not the vendor account for every business.';
  const href = signedOut ? '/customer-login?next=/owner' : '/customer';
  const label = signedOut ? 'Sign in' : 'Back to the company';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: #fafafa;
    color: #171717;
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    body { background: #0a0a0a; color: #fafafa; }
    .card { background: #141414; box-shadow: 0 0 0 1px rgba(255,255,255,.08); }
    .muted { color: #a3a3a3; }
    a { background: #fafafa; color: #171717; }
  }
  .card {
    width: min(100%, 28rem);
    padding: 1.5rem;
    border-radius: 0.75rem;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.06);
  }
  h1 { margin: 0; font-size: 1.25rem; letter-spacing: -0.02em; }
  p { margin: 0.5rem 0 0; color: #525252; line-height: 1.5; }
  a {
    display: inline-flex;
    margin-top: 1.25rem;
    padding: 0.5rem 0.9rem;
    border-radius: 0.5rem;
    background: #171717;
    color: #fafafa;
    text-decoration: none;
    font-size: 0.875rem;
  }
</style>
</head>
<body>
<main class="card">
<h1>${title}</h1>
<p class="muted">${body}</p>
<a href="${href}">${label}</a>
</main>
</body>
</html>`;
}
