# Architecture

Last updated: 30 Oct 2026. Describes what is in the repo. The route list with request shapes is `docs/API-V1.md`. Shared rules live in `src/lib/platform-rules.ts`. Records live in `src/types/index.ts`.

## Shape

One Next.js App Router app (`workplace-ops-web`, Next.js 16, React 19, TypeScript). It is the web console and the control plane for a future mobile client. Business rules, permissions, and module enablement run on the server. The browser does not keep a second copy of those rules.

```
Browser (customer cookie or operator cookie)
        │
        ▼
Next.js routes  ──►  src/lib/services/tenant.ts  ──►  Supabase (service role)
        ▲
        │
Mobile (not in this repo)  ──►  /api/v1  +  Authorization: Bearer
```

There is no `vercel.json`, no Supabase CLI config, and no mobile project. Hosting of the web app is Vercel. Company data region is a per-company field, not a locked deployment region.

## Multi-tenant model

A company is a tenant. `companies` holds `name`, unique `slug`, `industry_id`, and `region` (`za`, `eu`, or `multi`, default `za`). `users` belong to one company (`UNIQUE(company_id, email)`). The same email can exist in another company as a different row.

Signup (`POST /api/auth/signup`) creates the company and the first user with role `admin`, then inserts `company_modules` for that industry’s `default_modules`. Customer login issues an API token scoped to one company. If the password matches more than one company, the API returns HTTP 409 `company_required` and the caller sends `companySlug`.

Server functions take a `TenantActor` (`userId`, `companyId`, `role`, `email`) and query with `company_id`. There is no Postgres row-level security in the migrations. Isolation is the service-role queries in `src/lib/services/tenant.ts`. The service role bypasses RLS, so new queries must keep the company filter. Do not expose the service role key to the browser.

Stored customer roles are `admin`, `manager`, and `user` (`src/lib/platform-rules.ts`). Rank is user 1, manager 2, admin 3. Managers and admins can assign tasks and manage people. Only admins toggle modules, read audit, and change company settings. A ten-level department tree is not enforced. Departments have an optional `parent_id`. Visibility middleware that hides other people’s work by level is not finished. Users see their own tasks and their own incidents. Managers and admins see the company’s.

## Module gating

`modules` is the catalogue. `company_modules` is the per-company switch (`is_enabled`). `assertModule` loads enabled names for the actor’s company and rejects a disabled module with HTTP 403:

```json
{ "error": { "code": "module_disabled", "message": "...", "module": "wallet" } }
```

`GET /api/v1/bootstrap` lists every module with `enabled` so a client can hide one that is off. Mutating routes still check the server. The Modules page (`PUT /api/companies/modules`) is limited to admins (`canToggleModules`).

Industry defaults turn a subset on at signup. Modules from migration `003` (staff health, geofence attendance, Find My Staff, wallet, mini-apps, POS, CCTV) are not in those defaults, so they start off.

Catalogue-only modules (inventory, sales, patients, and the rest of the toggle-only list in `docs/PRODUCT.md`) can be enabled and still have no screen. `/customer/module/[slug]` returns `not_found` for an unknown slug.

## Auth

Two sessions. They do not share a secret.

### Operator

`/login` is the development operator gate. `isDevAdminLoginEnabled()` is true only when `NODE_ENV` is not `production`. Any username and any password is accepted. The form chooses Admin or Staff. `src/proxy.ts` sends an unsigned visitor from `/dashboard` back to `/login`, and sends `/admin` to `/dashboard`.

The cookie name is `admin_session`. `src/lib/session-token.ts` HMAC-signs it with `SESSION_SECRET`. A missing secret returns the form error "Operator sign-in is not configured. Set SESSION_SECRET." The cookie is httpOnly, `sameSite: lax`, `secure` in production, and lasts 12 hours. Customer bearer tokens do not use `SESSION_SECRET`.

### Customer

`POST /api/auth/customer-login` and `POST /api/v1/auth/login` both call `loginWithPassword`. Passwords are hashed with `bcryptjs`. The issued token is 32 random bytes, stored only as a SHA-256 hash in `api_tokens`, and expires after 7 days.

The browser stores that token in the httpOnly cookie `customer_session` (7 days, `sameSite: lax`, `secure` in production). Mobile must send `Authorization: Bearer` and must not rely on the cookie. Login tries the users-to-companies embed `companies!users_company_id_fkey`. If that join fails, it loads users and companies separately and logs the Supabase code, message, details, and hint. Migration `004` adds the foreign key when it is missing and asks PostgREST to reload its schema.

Invitation accept is `POST /api/v1/invitations/accept` (and the page `/invite/[token]`). It requires the `staff` module. The invitation response is a path. Email is not sent.

## Supabase

`src/lib/supabase.ts` builds two lazy clients so `npm run build` can finish with no env vars. They are created on first use.

| Client | Key | Who calls it |
| --- | --- | --- |
| `supabase` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Exported. No current route imports it. |
| `supabaseAdmin` | `SUPABASE_SERVICE_ROLE_KEY` | Signup, industries, modules, tasks, customer layout, and `tenant.ts`. |

`isSupabaseConfigured()` is true when `NEXT_PUBLIC_SUPABASE_URL` starts with `https://` and `SUPABASE_SERVICE_ROLE_KEY` is non-empty, and the combined string does not contain `placeholder`, `your_supabase`, or `your-project`. It does not check the anon key. Missing config returns HTTP 503 `not_configured` from tenant helpers, and the customer shell shows a short card. Pages do not render stack traces (`src/app/error.tsx`).

Migrations, in order:

| File | What it adds |
| --- | --- |
| `001_initial_schema.sql` | Industries, companies, users, modules, company modules, and the seeds. |
| `002_tasks_and_operations.sql` | Tasks, task comments, task media, departments, teams, invitations, schedules, attendance, notifications, audit logs. |
| `003_platform_modules.sql` | Later modules, `api_tokens`, incidents, staff health, geofences, travel exceptions, wallet, locations, cameras, POS orders, mini-apps. |
| `004_users_company_fkey.sql` | Users-to-companies foreign key if missing, and a PostgREST schema reload. |

Apply all four. The config card text still says migrations `001`–`003`. Login company lookup needs `004` when the foreign key was not already created by `001`.

## Vercel

The web app is deployed on Vercel. A preview build can finish with no Supabase env because the clients are lazy and `bcryptjs` replaced native `bcrypt`. Set the env vars in `docs/RUNBOOK.md` on the Vercel environment that serves the deployment, then redeploy. `NEXT_PUBLIC_*` values are inlined at build time.

`NODE_ENV=production` on Vercel turns the operator gate off. Customer login still works when Supabase is configured. There is no custom rewrite or region lock in the repo. Company `region` is stored data (`za`, `eu`, `multi`). It does not select a Supabase project.

## `/api/v1` and the mobile control-plane

`src/app/api/v1/[...path]/route.ts` forwards every method to `dispatch` in `src/lib/api-v1.ts`. `GET /api/v1/health` is public and returns the version, `supabaseConfigured`, and `API_V1_CATALOG`. It returns no tenant data.

The control-plane principle, locked in `docs/memory/DECISIONS.md`:

- The web app is the single source of truth for a future mobile client.
- Mobile calls `/api/v1` with `Authorization: Bearer`.
- Permissions and module checks stay in `tenant.ts` and `platform-rules.ts`. A client hides UI. It does not decide access.
- `GET /api/v1/bootstrap` returns the company, industry labels and starter checklists, the signed-in user and role, every module with `enabled`, and provider states.
- Provider states for payments, maps, CCTV, and email are `stub`. None of those networks are called. A stub response is not a payment, a stream, or an email.

No iOS or Android project exists. Do not scaffold one until the mobile toolkit is an active decision in `docs/memory/DECISIONS.md`.
