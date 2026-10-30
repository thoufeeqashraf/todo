# Signed-in QA

Checked on 30 Oct 2026 with `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. No Supabase project, Stripe secret, or browser session was available. Signed-in behaviour was exercised with an in-memory Supabase stand-in used only by the Node test runner (`tests/stubs/supabase.ts`). The runner is the existing `node --test` script. Jest and Vitest are not configured in this repo.

## Verified

- `loginWithPassword`: a null password hash and a hash bcrypt cannot read return 401. They do not throw. Two companies for one email return 409 `company_required`. Sending `companySlug` issues a token only for that company.
- Signup: the first user is `admin` on the new company, and industry `default_modules` are enabled for that company only. An empty industries table returns 400 and inserts nothing.
- Invitation accept: a pending invite creates the user in the inviting company and marks the invite accepted. A null `expires_at` returns 410 and inserts no user. Accept is refused when the staff module is off.
- Tasks: create stores `company_id` of the caller. An assignee in another company is 404. A floor-staff list contains only that person's rows. Updating another company's task is 404 and leaves the row unchanged. An empty task table returns `[]`. With the tasks module off, `GET /api/tasks` is 403 and does not read `tasks`.
- Module loaders, with the module off and again with the module on and the table empty:
  - `gateModule` plus `loadIncidents`, `loadAttendance`, `loadHealth`, `loadWallet`, `loadFindStaff`, `loadOrders`, `loadCameras`
  - `loadModule` for staff, scheduling, incidents, attendance, health, wallet, pos, cctv, mini-apps, find, notifications, and reports
  - `loadProjects`, `loadClients`, `loadInbox`, `loadAnalytics`
  - Attendance on `/customer/module/attendance` now checks `geofence_attendance`. It previously skipped that check.
  - A missing customer cookie redirects `gateModule` and `loadModule` to `/customer-login`. `loadProjects` returns `signed_out`.
  - Onboarding with a company row returns steps. A missing company row raises `PlatformError`, not `TypeError`.
- Billing checkout: no session is 401, a user or manager is 403, an admin is 503 while Stripe is unset.
- Rate limits: the 11th login in a minute is 429, and the 6th signup and the 6th invitation accept are 429.
- Home summary: null task dates and null statuses do not throw. The home feed does not read tasks, staff locations, or floor notifications unless those modules are on.

## Fixes from that run

- Login no longer calls bcrypt with a missing or non-bcrypt hash.
- Invitation expiry must be a real future time. A failed invite update is reported. A missing inserted user row is reported instead of throwing on `user.id`.
- Task create and update require a row back from the write.
- `POST /api/tasks` no longer reads `id` off a null row. `GET /api/tasks` returns `[]` when the query data is null.
- Signed-out `loadModule` redirects to `/customer-login`.
- The setup page shows the same not-configured card as the other customer pages.
- The customer home skips task, location, and notification reads when those modules are off, and ignores null timestamps and statuses.
- `User` is imported as a type so a type-stripped test can load the session module.

## Not verified

These need a real Supabase project, and some need Stripe or a browser:

- Row level security, foreign keys, PostgREST embeds, and the applied migrations. The mock does not speak Postgres.
- A password login against `supabase/seed/demo.sql`, or a real httpOnly cookie in the browser.
- Rendered customer pages, charts, and empty-state UI. Loaders were called directly.
- Stripe Checkout URL, the webhook signature, and rows in `subscriptions` and `invoices`.
- Email, map tiles, CCTV streams, and wallet charges. Those paths are still stubs.
- Rate limits across more than one server process. The counters are in memory.
- The Playwright smoke. It still does not sign in.
