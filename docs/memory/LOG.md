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
