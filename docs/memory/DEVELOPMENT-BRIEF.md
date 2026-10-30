# Workplace Todo / Business Operations Platform

Development brief and commercial reference, compiled October 2026 from product planning conversations. This file is the canonical upload. If a summary in `BRIEF.md` disagrees with this file, this file wins until the user changes it. Repo-shaped companions (`docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`, `docs/RUNBOOK.md`, `docs/ROADMAP.md`) describe what the code contains. If they disagree with this file, this file wins.

30 Oct 2026 note: system routes (not-found, error, loading, icons, manifest, robots, sitemap, Open Graph) use the name ToDo App and a checklist logomark. Constants live in `src/lib/seo.ts`. This does not set per-company logos or colours, and it does not close the open product-name item for the rest of the console.

Commercial model: SaaS, monthly or yearly subscriptions.

Developer deal context: 75% cash of the quoted amount, 25% ownership, no unpaid AMC after cash settlement. Price accordingly.

## 1. Product vision

A multi-tenant business operations and super-app platform where companies run tasks, staff accountability, attendance, industry-specific workflows, optional duty rosters, wallet payments, and later mini-apps and POS QR ordering. Visibility is role-based from floor staff up to executives.

The web platform has two separate logins.

1. Admin and staff. This is the operator entrance. Signing in here controls the mobile application that customers use. Tenants, configuration, and everything that app depends on are managed from this login.
2. Customers. A different login on the same web platform. A customer signs in and uses it to run their own business.

The mobile apps are the client those customers use. Admin and staff control that app from the operator login. Inside a customer company, higher officials still use the customer web for full detail, and frontline people still use mobile. Doer, assigner, and overseer are customer-side roles. They are not the operator admin and staff login.

This is not a personal todo app. The reference set is:

- Opscale / Zenput / Connecteam for ops and checklists
- Alipay-style mini-apps on the consumer side
- Wallet and QR pay through the Transaction Junction API
- Future POS and CCTV AI modules

## 2. Core principles

1. Multi-company SaaS. Target scale about 100,000 users across many companies.
2. Industry-aware onboarding. On company registration, the sector changes UI, labels, templates, and defaults.
3. Hierarchical visibility, up to about 10 staff levels. Higher levels see lower-level staff and work. Lower levels see only their own dashboard and assigned work.
4. Task allocation downward. Seniors assign work to juniors with deadlines.
5. Proof of work. Comments, photos, and videos on todos so seniors can see blockers and incomplete work.
6. Staff health, AI-driven. Score from history and other factors. Visible only to higher or designated seniors.
7. Escalation and black marks. Incomplete tasks notify HR or the industry-appropriate role. Marks land on staff health and profile, and can support performance or termination decisions.
8. Optional modules at setup. Example: AI duty roster only for industries or departments that need it.
9. Web and mobile. One web platform, two logins. Admin and staff use the operator login to control the mobile app and manage the platform. Customers use a separate login on that same web to run their business. Inside a customer company, the customer web is the deep view and mobile is the frontline tool.
10. Consumer mode. A person who is not in a company staff context sees a mini-apps marketplace, including third-party company mini-apps via API.
11. Wallet. Transaction Junction (South Africa) for funding, in-app transfers, and payment for services and mini-apps.
12. Future POS. Table QR order, then POS, kitchen print, and pay via wallet or counter QR.
13. Future premium CCTV. Live feed and AI reference checks.

## 3. Scenarios

### 3.1 Task failure / escalation

Staff misses a deadline. Notify the configured escalator (HR or an industry-specific role). Black mark on staff health and profile. Profile and health are visible only to higher or designated senior users. Repeated failures support performance and firing decisions.

### 3.2 Property / complex incident

Example: Flat 21 noise complaint in a residential complex. Resident or staff raises the issue. It routes to Security. Security receives the task, attends the apartment, resolves it, and uploads proof.

### 3.3 Find My Staff

Higher levels only. GPS permission from the staff mobile app. Authorised seniors locate staff in real time.

### 3.4 Geofenced clock-in

Clock-in only inside the company geofence. Outside the radius, clock-in is refused and a message is shown. Optional manual clock-in request to a senior. If a senior pre-allocated a travel day or client visit, clock-in is allowed outside the premises for that day. This blocks remote false attendance.

### 3.5 Wallet, P2P, and QR pay

Top up via the Transaction Junction API. Send to a username or phone, or scan a payment-receiver QR. Funds pay for mini-apps and services on the platform.

### 3.6 Future restaurant / café QR ordering

Scan a table QR, location-gated where required. View the menu, order, and pay via wallet or counter QR. The order hits the POS as a running order and the kitchen ticket prints. Ready status updates. The customer can add items or close and pay. One source of truth when the venue uses the same POS and this app.

## 4. Who uses it

### 4.1 High-fit industries

Construction and contracting. Restaurants, cafés, QSR, cloud kitchens. Hotels and hospitality. Property and facilities management. Retail stores and malls. Warehouses and logistics. Field services (plumbing, electrical, HVAC, cleaning). Manufacturing. Clinics and healthcare admin. Salons, spas, gyms. Schools and training centres. Security companies. Event venues and entertainment centres. Real estate agencies. Auto workshops. Franchise and multi-location brands. Offices, agencies, professional services. Government and municipal field teams. Nonprofits.

### 4.2 Departments

Operations, FOH, BOH / kitchen, store floor. Inventory / procurement. Maintenance / facilities. Housekeeping / cleaning. Safety / HSE. Sales. Marketing. HR. Finance / admin. IT. Dispatch / scheduling. Quality. Site management. Guest / tenant services. Training. Management / ownership.

### 4.3 Job profiles

Owners, GMs, area and regional managers. Store, site, and branch managers. Shift leaders, supervisors, foremen. Frontline staff (FOH, kitchen, retail, cleaners, technicians). Property and facility managers, security, concierge. HR, finance admins, ops coordinators. Field technicians, drivers, warehouse leads.

### 4.4 Two web entrances

| Entrance | Who | What they do |
| --- | --- | --- |
| Admin and staff | Platform operators | Control the mobile app customers use, and manage the platform from the web |
| Customer | Business customers | Separate login. Run their own company on the web: tasks, proof, hierarchy, dashboards |

The current `/login` route is only the temporary operator gate. It is not the customer entrance.

Inside a customer company, admins also have `/customer/audit`, `/customer/team`, and `/customer/billing`. Billing on that screen lists the company subscription and invoices and starts Stripe Checkout for admins. It is not the wallet.

### 4.5 Three primary user types on the customer side

1. Doers complete personal and assigned tasks.
2. Assigners create and assign work for a team or department.
3. Overseers watch progress by site, department, and staff health.

### 4.6 Strongest first markets

1. Restaurants
2. Retail
3. Property / facilities
4. Construction

Shared core need: assign, due time, checklist, proof (photo, note, or video), manager visibility.

The exact v1 industry list is still an open kickoff decision. The four markets above are the suggested start, not a lock.

## 5. Competitive landscape

### 5.1 General board tools

Trello, Asana, Monday.com, ClickUp, Notion, Jira, Basecamp, Todoist, Microsoft To Do, Google Tasks, Linear. Strong for office and project boards. Weaker for shift ops, proof, and multi-site compliance.

### 5.2 Ops and frontline checklist platforms

| App | Best for |
| --- | --- |
| Opscale | Multi-site ops, checklists, shifts |
| Zenput (Crunchtime Ops) | Restaurant and retail tasks and compliance |
| 7shifts Tasks | Restaurants and scheduling |
| Homebase | Small restaurants and retail, light tasks |
| YOOBIC | Large retail and brand standards |
| Xenia | SOPs, inspections, facilities |
| MaintainX / UpKeep | Maintenance and work orders |
| ServiceTitan / Jobber | Field service |
| Procore / Buildertrend / Fieldwire | Construction |
| Connecteam | Deskless teams, checklists, chat, AI scheduling |
| Tasa | Retail checklists, multilingual |
| Nodes | Multi-site rollout and opening tasks |

### 5.3 AI auto-allocation

Task auto-assign by role, shift, and site: Opscale, Zenput, Connecteam, Xenia, YOOBIC, Tasa.

Staff auto-schedule: Connecteam, Deputy, When I Work, Homebase, Planday, 7shifts.

Advanced AI routing: Assign.sh, MaintainX / UpKeep work orders, ServiceTitan dispatch.

Today’s market is mostly rules first, AI second: templates, then role, shift, and site, then who is on duty. Fully dynamic “best person every time” is still uncommon.

### 5.4 Differentiation

Few tools cover all of this well for SMBs across industries: who is on shift, what tasks they get, proof of done, auto-reassign if missed, staff health, and wallet / super-app.

## 6. Modules

| Module | Description | Phase |
| --- | --- | --- |
| Tenant / company onboarding | Industry selection, module toggles, branding | P1 |
| Org hierarchy and RBAC | Levels, departments, visibility rules | P1 |
| Tasks and checklists | Assign, due, comments, photo and video proof | P1 |
| Notifications | Delivery of task and system events | P1 |
| Web console | Customer login. Exec and manager deep views for their company | P1 |
| Mobile apps | Staff and manager light flows | P1 |
| Notifications and escalation | Missed task to the configured role | P2 |
| Staff health engine | Rules, then AI history scoring | P2 |
| Incidents / tickets | Example: noise to security | P2 |
| Attendance | Geofence clock-in, travel exceptions, manual requests | P2 |
| Find My Staff | GPS for authorised seniors | P2 |
| Duty roster (optional) | AI roster for selected industries | P3 |
| Industry template library | Packs per sector | P3 |
| Consumer super-app shell | Mini-apps marketplace | P4 |
| Wallet | Ledger, TJ API top-up, P2P, QR | P4 |
| POS QR ordering | Menu, order, kitchen, pay | P5 |
| CCTV AI | Live feed and AI checks | P6 |
| Platform admin and staff | Operator login. Control the customer mobile app, tenants, and platform configuration. Billing depth follows the commercial phase in force | With the phase that needs it |

Payments: use the Transaction Junction API for the wallet. Do not build a payment gateway for wallet top-up, P2P, or QR pay. Still build the wallet ledger, webhooks, reconciliation, QR flows, limits, and admin tools. That work is P4.

Company subscription billing (what a company pays for this product) is Stripe Checkout in INR: Starter ₹1,499/month, Growth ₹4,999/month, Scale ₹14,999/month. It is not the wallet and it does not replace Transaction Junction. Setup, keys, and the webhook URL are in `docs/BILLING.md`.

Customer web routes for the catalogue modules `projects`, `clients`, and `notifications` are `/customer/projects`, `/customer/clients`, and `/customer/notifications`. Each one stays closed unless that module is on. The projects screen is a board and a list of tasks, with departments as project names. There is no projects table and no clients table. Client accounts are stored on the clients module settings until a table exists. The notifications screen lists in-app rows for the signed-in user. Email and push are not connected.

## 7. Delivery phases

| Phase | Included |
| --- | --- |
| P1 Core Ops MVP | Signup, industry pack, hierarchy, roles and visibility, tasks and media, dashboards, notifications, web and mobile |
| P2 Control and accountability | Escalations, black marks, staff health v1, incidents, Find My Staff, geofence clock-in plus travel and manual request |
| P3 Roster and templates | AI duty roster for selected industries, richer templates, multi-location hardening, reporting |
| P4 Wallet and super-app shell | TJ top-up, wallet ledger, P2P, QR pay, mini-app framework |
| P5 POS / QR ordering | Table QR, POS, kitchen, wallet or counter QR pay |
| P6 CCTV AI premium | Live feed and AI reference checks |
| Buffer | Security, POPIA, DevOps, QA, scale toward 100,000 users |

Sell P1+P2 first. Re-quote later phases. Do not lock the entire vision into one cheap fixed price.

## 8. Commercial quote

Assumptions: face rate $35/hour. Developer receives 75% of face quote and owns 25%. After cash is paid, no unpaid future AMC, so the quote must preload risk and support, or the contract must still require paid support.

Effective cash rate if hours are not inflated: $35 × 0.75 = $26.25/hour.

### 8.1 Full vision with the TJ API

| Phase | Hours | Face at $35 | Developer receives (75%) |
| --- | ---: | ---: | ---: |
| P1 Core Ops MVP | 3,200 | $112,000 | $84,000 |
| P2 Control | 2,800 | $98,000 | $73,500 |
| P3 Roster and templates | 2,200 | $77,000 | $57,750 |
| P4 Wallet and super-app (API) | 2,200 | $77,000 | $57,750 |
| P5 POS / QR ordering | 2,400 | $84,000 | $63,000 |
| P6 CCTV AI | 2,000 | $70,000 | $52,500 |
| Buffer / platform risk | 2,200 | $77,000 | $57,750 |
| Total | ~17,000 | ~$595,000 | ~$446,000 |

Client-facing full vision: $580,000–$620,000 face. Cash to the developer (75%): about $435,000–$465,000.

Without the API, if more payment infrastructure is built: previously about $665,000 face / about $500,000 cash.

### 8.2 First sellable package

| Package | Face | Developer receives (75%) |
| --- | ---: | ---: |
| P1 + P2 only | $210,000 | $157,500 |
| P1 + P2 + P4 | $287,000 | about $215,000 |
| Wallet alone later (TJ API) | $70,000–$90,000 | $52,500–$67,500 |

### 8.3 If the client insists on no money after 75% is paid

Inflate so “free forever” is prepaid: core build, prepaid 24-month AMC, and equity risk premium. Present roughly $690,000 face (about $517,000 cash) for a large first platform, and still exclude P5 and P6 unless prepaid.

### 8.4 Contract must-haves

1. Phased statement of work and acceptance criteria.
2. Explicit out-of-scope until paid: CCTV, deep mini-apps, advanced ML staff health, full POS.
3. Paid support plan even if the client pushes back. Market AMC is often 15–25% of build per year.
4. Equity terms: 25% of which entity, vesting, dilution, and rights.
5. IP and repo ownership.
6. Budget for POPIA, GPS, staff scoring, and wallet legal compliance.
7. Assumptions: iOS, Android, and web; South African payments via Transaction Junction.

If the client pushes price, cut scope, not the rate.

## 9. Market pricing benchmarks (2025–2026)

### 9.1 Hourly rates

| Who | Typical rate |
| --- | --- |
| US / Canada agency | $150–$250/hr |
| Western Europe agency | $90–$180/hr |
| Eastern Europe senior | $45–$90/hr |
| India / South Asia senior | $30–$65/hr |
| South Africa senior | $35–$55/hr |
| US senior freelancer | $100–$180/hr |
| Face rate in this brief | $35/hr |

The face rate sits at mid-offshore / South Africa senior freelance. Agencies for this work often charge $80–$180/hr.

### 9.2 Project cost bands

| Tier | Market price |
| --- | --- |
| Basic SaaS MVP | $35k–$75k |
| Mid SaaS | $75k–$180k |
| Advanced multi-tenant SaaS | $180k–$450k |
| Enterprise SaaS | $300k–$1M+ |

### 9.3 Modules at market

| Module | Typical market build |
| --- | --- |
| Multi-tenant workforce / ops (web and mobile) | $150k–$400k |
| GPS attendance and Find My Staff | $40k–$120k |
| Staff health / AI and escalations | $40k–$150k |
| Industry templates and AI roster | $50k–$150k |
| Wallet via gateway API | $35k–$90k |
| Wallet closer to a custom payments core | $80k–$300k+ |
| Super-app / mini-apps shell | $80k–$250k+ |
| Restaurant QR to POS to kitchen | $70k–$200k |
| CCTV and AI | $100k–$400k+ |

### 9.4 Full vision at market

| Builder | Estimate |
| --- | --- |
| Cheap offshore, often underdelivered | $200k–$400k |
| Serious mid-market team | $500k–$1.2M |
| US / EU agency | $1M–$3M+ |
| Alipay-scale over years | $2M–$10M+ |

About $600,000 face with the TJ API is fair mid-market, slightly discounted.

### 9.5 Language for clients

Connecteam / Zenput-style ops platforms cost $250k–$700k custom. Wallet and QR via a payment API is typically $35k–$90k; deeper fintech is much more. A mini-app marketplace is often $150k+ alone. US agencies would quote the full vision closer to $1M–$2M+.

## 10. AI allocation sketch

Inputs: industry and department templates, org roles and hierarchy, who is on shift or clocked in, skills and certifications later, site and geofence, task priority and SLA, staff health and past completion.

Flow:

1. A manager or the system publishes a template (opening, cleaning, inspection, incident).
2. The system matches role, shift, and location.
3. It assigns staff who are eligible and on duty.
4. AI assists: generate checklists, suggest assignees, create corrective tasks on failure, optional roster fill.
5. A missed task escalates, adds a black mark, and can reassign.

Rules first, AI second. Fully dynamic assignment is later than the rules engine.

## 11. Build order

1. Multi-tenant auth and company industry pack
2. Departments, roles, hierarchy, visibility middleware
3. Task CRUD, assign, due, media attachments
4. Staff dashboards and manager dashboards on web and mobile
5. Notifications and escalation rules
6. Staff health v1, rules-based, then AI later
7. Incident routing
8. Geofence attendance and Find My Staff
9. Optional roster module flag
10. Wallet ledger and TJ webhooks
11. Consumer mini-app shell
12. POS QR after POS API contracts are clear
13. CCTV premium last

GPS tracking, staff scoring, and wallet money movement need POPIA, labour, and payments legal review in South Africa.

The web app has a Playwright smoke (landing, signup, customer login, unauthenticated `/customer` redirect) that runs on a local production build with no Supabase keys. That smoke is not P1 acceptance. Playwright is a devDependency and does not run during `npm run build`.

## 12. Quote floor

| Decision | Number |
| --- | --- |
| Full vision face, with TJ API | $580,000–$620,000 |
| Cash for that full vision at 75% | about $435,000–$465,000 |
| First sale | P1+P2 at $210,000 face / $157,500 cash |
| Rate | $35/hr face. Protect it with phases and scope cuts |
| Equity | 25% is not free maintenance forever. Put AMC and future work in writing |

## 13. Open kickoff decisions

- Exact industry list for v1 templates. Suggested start: restaurant, retail, property, construction.
- Max hierarchy depth and default role names per industry.
- Who receives escalations by default per industry.
- Staff health formula v1: weights for lateness, misses, quality of proof, peer flags.
- GPS retention policy and consent UX.
- Wallet KYC level required with Transaction Junction.
- Consumer mini-apps at launch: zero or a few partner APIs.
- Cross-platform stack. Examples named in the brief: Next.js web, React Native or Flutter. Not chosen.
- Hosting region: South Africa, EU, or multi-region.

Web UI component library is already decided outside this brief: shadcn, until replaced. That decision does not choose the mobile toolkit.

Schema notes for this repo live in `docs/DATABASE.md`. The app uses the Supabase service role. Row level security denies the anon key. Sample rows, when seeded, belong to company slug `demo-kitchen` and are not written onto any other company.
30 Oct 2026 implementation note: the future mobile client calls `/api/v1` (`docs/API-V1.md`). The server checks the bearer token, the company, the role, and whether the module is on. Payments, map tiles, CCTV streams, and email remain stubs and are not called.
Customer analytics at `/customer/analytics` is a reports-module view of existing task, attendance, and incident rows. It does not add tables. Incident severity is classified from `incidents.status` because that table has no severity column.
## 14. Help center and setup checklist (repo, 30 Oct 2026)

This note records what the web app serves. It does not change phase scope, quotes, or the open decisions above.

- `/help` is public. Articles and categories live in `src/content/help.ts`. Each article is `/help/[slug]`. Search filters that file in the browser.
- `/customer/onboarding` is the signed-in setup checklist: create a team (`teams`), invite staff (`invitations` or a second user), enable modules (`company_modules.is_enabled`), set a geofence (active `geofences`), connect mobile later. Mobile stays open. No phone is stored.
- `/customer/module/onboarding` remains the older company, industry, region, module, people, and first-task list. It is a different screen.
- Other UI should import `/help` and `/customer/onboarding` from `src/components/help/nav.ts`.
- No new table or migration.
