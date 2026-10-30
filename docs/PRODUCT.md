# Product

Last updated: 30 Oct 2026. Read from the repo and from `docs/memory/DEVELOPMENT-BRIEF.md`. If this file and the development brief disagree, the brief wins until the user edits it. The product name is still an open kickoff decision. The web app title in `src/app/layout.tsx` is "Workplace operations".

## Vision

A multi-tenant SaaS for business operations. A company runs tasks, staff, and industry-specific workflows on the web. Later phases add attendance, staff health, roster, wallet, a consumer mini-app shell, POS QR ordering, and premium CCTV AI. Those later phases are outside the current window (30 Oct 2026 – 30 Apr 2027), which sequences P1.

This is not a personal todo app. The reference set in the brief is ops and checklist tools (Opscale, Zenput, Connecteam), a later Alipay-style mini-app shell, wallet and QR pay through the Transaction Junction API, and future POS and CCTV modules.

Commercial model: monthly or yearly subscriptions. Target scale about 100,000 users across many companies. Face rate, packages, and hour totals stay in the development brief. This file does not restate the quote.

Clients in the brief: web, iOS, and Android. Only the web app is in this repo. No mobile app is scaffolded.

## Two web entrances

| Entrance | Route today | Who | What they do |
| --- | --- | --- | --- |
| Operator | `/login` → `/dashboard` | Platform admin and staff | Development-only gate. Any username and password signs in while `NODE_ENV` is not `production`. The dashboard is a preview of companies. It does not manage live tenants. |
| Customer | `/signup`, `/customer-login` → `/customer` | A company and its people | Signup creates the company and its first user with role `admin`. That person runs the company on the web. |

`/admin` redirects to `/dashboard`. Doer, assigner, and overseer are customer-side personas in the brief. They are not stored role names.

## Personas

### Platform operator

Signs in at `/login` and chooses Admin or Staff. The cookie is HMAC-signed with `SESSION_SECRET`. The gate is hard-off in production. Delete `src/lib/dev-admin-login.ts` and this open sign-in before go-live. Operators are meant to control the future customer mobile app and platform configuration. That control plane is not built beyond the preview dashboard.

### Company admin

Created at signup. Role `admin`. Can turn modules on and off, read the audit log, change company name and region (`za`, `eu`, or `multi`), set a geofence, and book wallet ledger adjustments. The wallet adjustment is bookkeeping. It is not a card charge.

### Manager

Role `manager`. Can invite people, create departments, see company tasks, assign work, write a `travel_exceptions` row, and see the provisional staff-health score. A user cannot grant that exception for themselves. Clock-in treats the exception as `manualApproved`. A current shift of type `travel` is a separate allowance (`travelDay`).

### Frontline user

Role `user`. Sees their own tasks and their own incident reports. Cannot assign work to others, toggle modules, or view staff health. In the brief this person is the doer, and on mobile they are the frontline client. Mobile is not built.

### Assigner and overseer

Brief personas, not database roles. Assigner maps to the current manager and admin ability to create and assign tasks. Overseer maps to manager and admin visibility of company tasks and the provisional staff-health score. Site, department, and ten-level visibility are not finished. The stored roles are only `admin`, `manager`, and `user`.

## What the customer can do now

Present on the customer web when Supabase is configured and migrations `001`–`004` are applied:

- Sign up with an industry and a region, then sign in. The same email in more than one company must pick a company slug.
- Turn modules on and off (admin). Industry `default_modules` are enabled at signup. Migration `003` also adds `notifications` and `reports` to every industry that does not already list `notifications`.
- Tasks: create and list. Users see their own. Managers and admins see the company. Status values are `todo`, `in_progress`, `completed`, `overdue`. Priority values are `low`, `medium`, `high`, `urgent`.
- Staff: list users, invite by copying a link (`/invite/[token]`). Email is not sent.
- Departments, shifts (`regular` or `travel`), incidents, in-app notifications, audit (admin), a partial task-count report, and an onboarding checklist derived from stored company data.
- Geofence clock-in, travel-day exceptions, and Find My Staff coordinates when those modules are on. No map tiles.
- Staff health as a rules score with provisional weights. It is not an AI model.
- Wallet ledger, POS orders that stay `unpaid`, a CCTV camera registry with no stream, and an empty mini-app list.

Not built, even where a table exists: proof comments, photos, and video (`task_comments` and `task_media` are in migration `002` and have no app writes); checklists as stored tasks (starter checklist names exist only as industry labels); ten-level visibility; AI roster; AI staff health; company logos and colours; email and push; a mobile app.

## Industries

The signup catalogue is the `industries` seed in `supabase/migrations/001_initial_schema.sql`. Which packs are commercially in v1 is still open. The brief’s suggested first markets are restaurant, retail, property, and construction. Only those four have label and starter-checklist copy in `INDUSTRY_LABELS` (`src/lib/platform-rules.ts`). Every other industry uses the generic labels Task, Staff, and Site, and an empty checklist list.

| `name` | Display name | Default modules at seed |
| --- | --- | --- |
| `restaurant` | Restaurant & Food Service | tasks, staff, scheduling, inventory |
| `retail` | Retail & Stores | tasks, staff, scheduling, inventory, sales |
| `property` | Property Management | tasks, staff, scheduling, maintenance |
| `construction` | Construction | tasks, staff, scheduling, projects, equipment |
| `hospitality` | Hospitality | tasks, staff, scheduling, housekeeping |
| `healthcare` | Healthcare | tasks, staff, scheduling, patients |
| `logistics` | Logistics & Transportation | tasks, staff, scheduling, deliveries, fleet |
| `manufacturing` | Manufacturing | tasks, staff, scheduling, production, quality |
| `education` | Education | tasks, staff, scheduling, classes |
| `security` | Security Services | tasks, staff, scheduling, incidents, patrol |
| `cleaning` | Cleaning & Facilities | tasks, staff, scheduling, maintenance |
| `agriculture` | Agriculture & Farming | tasks, staff, scheduling, crops, equipment |
| `events` | Events & Entertainment | tasks, staff, scheduling, events |
| `warehousing` | Warehousing | tasks, staff, scheduling, inventory, deliveries |
| `field_services` | Field Services | tasks, staff, scheduling, maintenance, equipment |
| `salon_spa` | Salon & Spa | tasks, staff, scheduling, appointments |
| `gym_fitness` | Gym & Fitness | tasks, staff, scheduling, classes, members |
| `automotive` | Automotive Services | tasks, staff, scheduling, maintenance, equipment |
| `real_estate` | Real Estate Agency | tasks, staff, scheduling, properties, clients |
| `franchise` | Franchise Operations | tasks, staff, scheduling, inventory, reports |
| `professional_services` | Professional Services | tasks, staff, scheduling, projects, clients |
| `government` | Government & Municipal | tasks, staff, scheduling, maintenance, incidents |
| `nonprofit` | Nonprofit | tasks, staff, scheduling, events, volunteers |
| `veterinary` | Veterinary Services | tasks, staff, scheduling, patients, appointments |
| `pharmacy` | Pharmacy | tasks, staff, scheduling, inventory, patients |
| `dental` | Dental Practices | tasks, staff, scheduling, patients, appointments |
| `childcare` | Childcare & Daycare | tasks, staff, scheduling, children, parents |
| `catering` | Catering Services | tasks, staff, scheduling, events, inventory |
| `laundry` | Laundry & Dry Cleaning | tasks, staff, scheduling, orders, equipment |
| `printing` | Printing Services | tasks, staff, scheduling, orders, production |

Migration `003` appends `notifications` and `reports` to each industry’s defaults when `notifications` is missing. `reports` is already in the franchise seed, so that industry gains `notifications` only from this update.

Label copy for the four suggested markets:

| Industry | Task | Staff | Site | Starter checklists |
| --- | --- | --- | --- | --- |
| restaurant | Shift task | Crew | Venue | Opening, Closing |
| retail | Floor task | Associates | Store | Opening, Closing |
| property | Work order | Site team | Property | Inspection |
| construction | Site task | Crew | Job site | Daily start |

## Modules catalogue

Modules are rows in `modules`, seeded by migrations `001` and `003`, and listed as `ModuleName` in `src/lib/platform-rules.ts`. A company turns a row on in `company_modules`. The customer Modules screen groups them by `category`.

Many seeded modules are catalogue entries only. They can be toggled. They have no customer screen and no `/api/v1` route. The screens that exist are listed in the last column.

### Seeded in migration 001

| Name | Display name | Category | App surface |
| --- | --- | --- | --- |
| `tasks` | Tasks | core | `/customer/tasks` and `/api/v1/tasks` |
| `staff` | Staff Management | core | `/customer/staff` and staff API routes |
| `scheduling` | Scheduling | core | `/customer/module/scheduling` |
| `inventory` | Inventory | operations | Toggle only |
| `sales` | Sales | operations | Toggle only |
| `maintenance` | Maintenance | operations | Toggle only |
| `projects` | Projects | operations | Toggle only |
| `equipment` | Equipment | operations | Toggle only |
| `housekeeping` | Housekeeping | operations | Toggle only |
| `patients` | Patients | operations | Toggle only |
| `deliveries` | Deliveries | operations | Toggle only |
| `fleet` | Fleet Management | operations | Toggle only |
| `production` | Production | operations | Toggle only |
| `quality` | Quality Control | operations | Toggle only |
| `classes` | Classes | operations | Toggle only |
| `incidents` | Incidents | operations | `/customer/module/incidents` |
| `patrol` | Patrol | operations | Toggle only |
| `crops` | Crops | operations | Toggle only |
| `events` | Events | operations | Toggle only |
| `appointments` | Appointments | operations | Toggle only |
| `members` | Members | operations | Toggle only |
| `properties` | Properties | operations | Toggle only |
| `clients` | Clients | operations | Toggle only |
| `volunteers` | Volunteers | operations | Toggle only |
| `children` | Children | operations | Toggle only |
| `parents` | Parents | operations | Toggle only |
| `orders` | Orders | operations | Toggle only. This is not the POS orders module. |
| `reports` | Reports | analytics | `/customer/module/reports`. Task counts only. |
| `notifications` | Notifications | system | `/customer/module/notifications`. In-app rows. |

### Seeded in migration 003

These stay off until a company enables them. They are not part of industry `default_modules`.

| Name | Display name | What the app actually does |
| --- | --- | --- |
| `staff_health` | Staff health | Rules score for managers and admins. Weights are provisional (`miss` 15, `late` 5, `proofRejected` 8, complete bonus capped at 20). Not an AI model. |
| `geofence_attendance` | Geofence attendance | Admin saves a circle. Clock-in is allowed inside it, when a current shift is type `travel`, or when a `travel_exceptions` row exists for today. No maps. |
| `find_my_staff` | Find My Staff | Stores coordinates only when `consent` is true. No map tiles. |
| `wallet` | Wallet | Ledger in cents, currency default `ZAR`. Admin adjustment is bookkeeping. Top-up returns HTTP 501, `movedMoney: false`. |
| `mini_apps` | Mini-apps | Empty marketplace. No partner API. |
| `pos` | POS orders | Orders can be stored and stay `unpaid`. |
| `cctv` | CCTV registry | Camera name and site. `streamUrl` is null. |

Customer navigation also links Onboarding, Audit, and Settings. Those are not module rows. Audit is admin-only. Settings can set `name` and `region`.

## Phase cut

P1 is the current window: signup, industry pack, hierarchy, tasks and proof, dashboards, notifications, web, and mobile. In the repo, signup, industry defaults, module toggles, three roles, basic tasks, and in-app notifications exist. Hierarchy depth, proof, role dashboards, and mobile do not.

P2 (escalation, black marks, staff health, incidents, Find My Staff, geofence attendance) starts only after P1 acceptance. Partial server paths for those items exist and are module-gated. They are not accepted P2 work. P3–P6 (AI roster, wallet and mini-apps, POS, CCTV AI) stay after 30 Apr 2027. See `docs/ROADMAP.md` and `docs/TIMELINE.md`.
