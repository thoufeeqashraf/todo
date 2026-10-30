# Work log

Append a short entry when a meaningful piece of work lands. Do not log speculation.

## 30 Oct 2026

- Locked the web audience split: admin and staff control the customer mobile app from the operator login; customers use a separate login on the same web for their business.
- Created project memory: brief, decisions, this log, and the six-month timeline.
- Added Cursor rules so later chats read that memory and update it.
- Recorded shadcn as the current web UI library.
- Left app scaffolding unstarted. Next input is the user’s research and product details.
- Filed `DEVELOPMENT-BRIEF.md` (product, competitors, phases, quote, build order, open kickoff items).
- Revised the brief, decisions, rules, and timeline. The six-month window now sequences P1. P3–P6 and most of P2 stay after 30 Apr 2027.
- Scaffolded the web app (Next.js, TypeScript, Tailwind, shadcn) so `npm run dev` starts the web console. Mobile apps are still not scaffolded.
- Added a temporary admin login at `/login`. Any username and password opens `/admin`. This is not the December multi-tenant auth work.
- Moved that development sign-in onto `/dashboard` as admin, and turned the gate off when `NODE_ENV` is production so it cannot stay on at go-live.
- Built the operator dashboard at `/dashboard` for admin and staff. Development sign-in chooses the role. The companies shown are a preview, and the gate stays off in production.
- Added customer signup, customer login, industry catalogue, module toggles, and a company dashboard on the web. Customer sessions are bearer tokens stored in an httpOnly cookie and checked against the database. `/login` is still the development operator gate.
- Added `/api/v1` for a future mobile client, including `GET /api/v1/health` and `GET /api/v1/bootstrap`. Web screens call the same server rules.
- Tasks, staff invitations, departments, shifts, incidents, geofence clock-in, staff-health events, notifications, audit, reports, and onboarding checklist have server paths. They need the Supabase migrations and do nothing until those keys are set.
- Wallet top-up, POS payment, CCTV streams, map tiles, email, and mini-app partners are stubs. They do not move money, open a stream, or send mail.
- Proof photos and video, ten-level visibility, AI roster, AI staff health, and mobile apps are not built.
- Replaced native `bcrypt` with `bcryptjs` and deferred Supabase client setup until a request uses it, so a Vercel build with no env vars can resolve dependencies and finish `npm run build`.
- Recorded the web control-plane decision and wrote the `/api/v1` contract in `docs/API-V1.md`. The Vercel preview for the dependency fix is READY.
- Rebuilt the visible web UI in small commits: sidebar shell, landing, signup industry cards, customer sign-in, dashboard, module switches, and the task table. Module screens sit in the shell. Operator `/login` behaviour is unchanged. Company branding (logos and colours) is still not built.
- Documented `SESSION_SECRET` in `.env.example` and `docs/API-V1.md`. It is set on Vercel. Missing Supabase or session config shows a short card or form error. Pages do not render stack traces. Migration `001` seeds industries and core modules. Migration `003` seeds the later modules. Signup still inserts the first user with role `admin`.
- Customer login no longer depends on PostgREST discovering the users-to-companies embed. It uses `companies!users_company_id_fkey`, and if that join fails it loads the company by `company_id` and logs the Supabase code, message, details, and hint. Migration `004` adds that foreign key when it is missing and asks PostgREST to reload its schema.
- The customer shell is branded ToDo App, with breadcrumbs, command search, an organisation menu, a user menu, and an unread notification count. The company dashboard shows real task counts, a status chart, activity, due tasks, and team location marks. Chart colours live in the theme tokens. Floor staff still only see their own tasks.
- Added Stripe company billing: migration `005_billing.sql` (`plans`, `subscriptions`, `invoices`, keyed by `company_id`, RLS denies anon), the Starter / Growth / Scale INR catalogue, a lazy Stripe client, admin checkout at `POST /api/billing/checkout`, and a signed webhook that upserts subscription and invoice rows. No keys are required to build. Checkout returns 503 `Billing not configured` until they are set. The customer billing screen was not changed. Setup is `docs/BILLING.md`.
