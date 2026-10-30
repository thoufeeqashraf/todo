# Six-month timeline

Window: 30 Oct 2026 – 30 Apr 2027.
Status values: `done`, `in progress`, `pending`.
Source of scope: `docs/memory/DEVELOPMENT-BRIEF.md`.
Visual plan: the six-month canvas. When a status below changes, update that canvas in the same change.

This window sequences **P1**. Quoted P1 is 3,200 hours. One full-time developer for six months is about 960 hours (6 × 160). April 2027 is not the date those quoted hours are finished.

Counts on 30 Oct 2026, this window only: **7 done**, **1 in progress**, **11 pending**.

Repo status the same day, outside these checkboxes: customer web and `/api/v1` include partial slices for incidents, roster shifts, staff health, geofence attendance, Find My Staff, wallet, POS, CCTV, and mini-apps. Those slices are module-gated. Payments, map tiles, CCTV streams, email, and partner mini-apps are stubs. They are not accepted P2–P6 work and they do not pull those phases into this window. `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`, `docs/RUNBOOK.md`, and `docs/ROADMAP.md` describe that repo. They do not change the checkboxes below. `004_indexes_and_rls.sql` denies the anon and authenticated roles, indexes company and foreign-key columns, and maintains `updated_at`. `supabase/seed/demo.sql` loads sample staff, tasks, schedules, and incidents on company slug `demo-kitchen` only. See `docs/DATABASE.md`. April security acceptance is still open.

## Done

- [x] Project memory, Cursor rules, and shadcn as the web UI library
- [x] File the development brief and commercial reference
- [x] Cut the window to P1, with P3–P6 and most of P2 after 30 Apr 2027
- [x] Publish this timeline and the matching canvas

## In progress — November 2026, kickoff

- [ ] Lock the decisions that block coding: stack, hosting, v1 industries, hierarchy defaults, and default escalation roles (`DECISIONS.md`)

## December 2026 — Tenant and shells

- [x] Multi-tenant auth and company signup (web customer login, first admin, bearer-token `/api/v1`; Supabase migrations required; `/login` stays the dev operator gate)
- [x] Industry selection and per-company module toggles, including industry defaults
- [ ] Company branding. The console type and sidebar shell are in progress; per-company logos and colours are not.
- [x] Scaffold the web app with Next.js and shadcn (`npm run dev`)
- [ ] Scaffold iOS and Android after the mobile toolkit is chosen

## January 2027 — Hierarchy and visibility

- [ ] Departments, roles, and hierarchy (up to about 10 levels). Departments and admin/manager/user exist; the ten-level visibility rules are not finished.
- [ ] Visibility middleware: higher levels see lower levels; lower levels see their own work

## February 2027 — Tasks and proof

- [ ] Tasks, downward assignment, deadlines, and checklists. Basic task create/list and assignment rules exist. Checklists and proof media do not.
- [ ] Comments, photo proof, and video proof

## March 2027 — Dashboards and notifications

- [ ] Doer, assigner, and overseer dashboards
- [ ] Web console for officials and mobile flows for frontline staff
- [ ] Notifications. In-app rows exist when the module is on. Email and push are not connected.

## April 2027 — P1 acceptance, then the first P2 slice

- [ ] P1 acceptance: security, POPIA review points, and QA on web and mobile
- [ ] Escalation notify and black marks, only after P1 is accepted

## After 30 Apr 2027

Do not pull these into the window without revising this file.

| Work | Quoted hours | Face at $35 |
| --- | ---: | ---: |
| Rest of P2: staff health v1, incidents, Find My Staff, geofence clock-in, travel day, manual clock-in request | inside the 2,800 P2 total | inside $98,000 |
| P3 Roster and templates | 2,200 | $77,000 |
| P4 Wallet (TJ API) and super-app shell | 2,200 | $77,000 |
| P5 POS / QR ordering | 2,400 | $84,000 |
| P6 CCTV AI | 2,000 | $70,000 |
| Buffer across the full vision (security, POPIA, DevOps, QA, scale) | 2,200 | $77,000 |

First sale in the brief remains P1+P2 at $210,000 face. Build order inside P2 after the April slice: staff health rules, incident routing, then geofence attendance and Find My Staff.
