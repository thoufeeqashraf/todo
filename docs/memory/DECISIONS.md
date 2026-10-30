# Decisions

Locked choices. Newest first. Change a row only when the user replaces the decision, and note the date.

| Date | Decision | Status |
| --- | --- | --- |
| 30 Oct 2026 | Platform system routes use the public name ToDo App and a checklist logomark. That covers not-found, error, global error, loading, `robots.ts`, `sitemap.ts`, `manifest.ts`, `icon.tsx`, `apple-icon.tsx`, and `opengraph-image.tsx`. Shared copy and URLs live in `src/lib/seo.ts`. Root layout metadata is unchanged. Per-company logos and colours are still not built. The open kickoff item “Product name” stays open for the rest of the console. | Active |
| 30 Oct 2026 | Product, architecture, design system, runbook, and roadmap live in `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`, `docs/RUNBOOK.md`, and `docs/ROADMAP.md`. They describe the repo. `DEVELOPMENT-BRIEF.md` stays canonical if they disagree. | Active |
| 30 Oct 2026 | Tenant tables and the public catalogues use row level security. Policies deny `anon` and `authenticated`. The service role stays the only app data path and is not forced through those policies. Demo seed rows belong only to company slug `demo-kitchen`. If that slug is already a non-demo company, the seed stops. | Active |
| 30 Oct 2026 | Web smoke tests use Playwright against `next start` after `npm run build`. They cover the landing page, signup, customer login, and the unauthenticated `/customer` redirect. They do not need Supabase keys. `@playwright/test` is a devDependency. `npm run build` does not run Playwright. GitHub Actions runs lint, typecheck, unit tests, the production build, and that smoke. | Active |
| 30 Oct 2026 | Company billing at `/customer/billing` is a placeholder. It does not connect to a payment provider, Transaction Junction, or card checkout. Usage figures are counts from the company, not a bill. | Active |
| 30 Oct 2026 | Customer reports draw task counts with the shadcn chart wrapper and recharts. Recharts is the chart engine for that wrapper. It is not a second web component library. | Active |
| 30 Oct 2026 | Customer console screens at `/customer/incidents`, `/customer/attendance`, `/customer/health`, `/customer/find-my-staff`, `/customer/wallet`, `/customer/pos`, and `/customer/cctv` read the existing company tables when that module is on. The shell links them from `src/components/modules/nav.ts`. Wallet top-up does not move money. Find My Staff does not load map tiles. CCTV tiles are placeholders. These screens do not move P2–P6 into the six-month window. | Active |
| 30 Oct 2026 | `/api/v1` is the mobile contract in `docs/API-V1.md`. Lists use `limit`/`offset` and `{ items, page }`. Errors are `{ error: { code, message } }`. Modules and role floors are enforced on the server. Login and invite accept are capped at 10 requests per minute per address; other routes at 120. The limiter is in-memory per instance. Wallet top-up still does not move money. | Active |
| 30 Oct 2026 | Customer projects, clients, and notifications screens live at `/customer/projects`, `/customer/clients`, and `/customer/notifications`. They stay off unless that module is enabled. Projects reads the `tasks` table (departments are the project names). There is no projects or clients table, so this pass does not add a migration. Client directory rows are the `clients` array on `company_modules.settings` for the clients module. Notifications are the signed-in user’s in-app rows. Email and push stay unconnected. | Active |
| 30 Oct 2026 | Customer analytics is `/customer/analytics`, linked from `src/components/analytics/nav.ts`. It renders only when the reports module is on. It reads existing task, attendance, user, and incident rows for the signed-in company. It does not add tables. Incident severity is classified from `incidents.status` because that table has no severity column; other statuses, including `open`, count as unspecified. Floor staff see only their own rows. | Active |
| 30 Oct 2026 | The public marketing site and the auth entrances (landing, signup, customer sign-in, operator sign-in, and invite) use the product name ToDo App and a shared logomark. Per-company logos and colours are still not built. The development brief title stays as filed until that file is edited. | Active |
| 30 Oct 2026 | Public help articles are static TypeScript in `src/content/help.ts`, served at `/help` and `/help/[slug]`. The customer setup checklist at `/customer/onboarding` reads `teams`, `invitations`, `users`, enabled `company_modules`, and active `geofences` through the existing Supabase client and customer session. It does not add a table. Mobile stays incomplete because no device is stored. Other screens should import paths from `src/components/help/nav.ts`. | Active |
| 30 Oct 2026 | Company subscriptions use Stripe Checkout in INR. The catalogue is Starter (₹1,499/month), Growth (₹4,999/month), and Scale (₹14,999/month). Keys are `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and one price id per plan. Missing keys leave the build working and checkout returns 503 `{ "error": "Billing not configured" }`. This is what the company pays for the product. It is not the wallet. The wallet stays on the Transaction Junction API. Setup is `docs/BILLING.md`. | Active |
| 30 Oct 2026 | The development operator cookie is HMAC-signed with `SESSION_SECRET`. The name is documented in `.env.example`. The value is set on Vercel and is never committed. Customer bearer tokens do not use it. A missing secret returns a short form error. | Active |
| 30 Oct 2026 | Company hosting region is a per-company setting: `za` (South Africa), `eu`, or `multi`. It is chosen at signup and can be changed in company settings. A single deployment region is not locked. | Active |
| 30 Oct 2026 | The web app is the control plane and single source of truth for a future mobile client. Business rules, permissions, and module enablement run only on the server. Mobile calls `/api/v1` with `Authorization: Bearer`. The browser stores that same token in an httpOnly cookie and does not enforce a second set of rules. `GET /api/v1/bootstrap` returns the tenant's modules, role, and provider status. Shared types live in `src/types` and `src/lib/platform-rules.ts`. The route list is `docs/API-V1.md`. No mobile app is scaffolded. | Active |
| 30 Oct 2026 | One web platform, two logins. Admin and staff use the operator entrance to control the mobile app customers use and to manage the platform. Customers use a separate login on the same web to run their own business. Doer, assigner, and overseer stay on the customer side. The current `/login` route is the operator gate only. | Active |
| 30 Oct 2026 | Development-only operator gate at `/login`. Any username and any password signs in. The form chooses Admin or Staff and opens that role’s `/dashboard`. Hard-off when `NODE_ENV` is `production`. Delete `src/lib/dev-admin-login.ts` and this open sign-in before go-live. | Active |
| 30 Oct 2026 | Web app is Next.js App Router, TypeScript, Tailwind, and shadcn. Run it with `npm run dev`. | Active |
| 30 Oct 2026 | `docs/memory/DEVELOPMENT-BRIEF.md` is the canonical product and commercial reference. | Active |
| 30 Oct 2026 | First build is P1 (signup, industry pack, hierarchy, tasks and proof, dashboards, notifications, web and mobile). P2 starts only after P1 acceptance. | Active |
| 30 Oct 2026 | P3, P4, P5, and P6 stay out of the current window until a timeline revision. Do not implement roster AI, wallet, mini-apps, POS, or CCTV during P1. | Active |
| 30 Oct 2026 | Wallet, when built, uses the Transaction Junction API. Do not build a payment gateway. | Active |
| 30 Oct 2026 | Face rate stays $35/hour. If a client pushes price, cut scope, not the rate. Quote floors live in the development brief, sections 8 and 12. | Active |
| 30 Oct 2026 | Web UI uses shadcn. Do not add a second web component library unless this decision is replaced. Mobile toolkit is still open. | Active |
| 30 Oct 2026 | Ship web, iOS, and Android. Web is the deep console. Mobile is the frontline client. | Active |
| 30 Oct 2026 | Planning window stays 30 Oct 2026 through 30 Apr 2027, as a P1 sequence. Quoted hours are larger than that window. | Active |
| 30 Oct 2026 | Do not scaffold iOS or Android until the mobile toolkit is an active decision here. The web shell is already scaffolded. | Active |
| 30 Oct 2026 | Repo files under `docs/memory/` and `docs/TIMELINE.md` are the project memory. Cursor rules stay aligned with them. | Active |
| 30 Oct 2026 | Do not invent modules beyond the development brief. | Superseded by the brief being the source of scope |
| 30 Oct 2026 | Wait for uploaded research before defining modules. | Superseded 30 Oct 2026. Research is filed. |

## Open (kickoff)

Resolve these before the code they block. Suggested defaults are hints from the brief, not locks.

- Product name. Public pages currently say ToDo App. The development brief title is unchanged until that file is edited.
- Stack: web framework, mobile toolkit (React Native or Flutter are examples only), shared-code approach
- Single deployment region, if one is required later. Company data region is already `za`, `eu`, or `multi`.
- v1 industry packs. The signup catalogue is configuration data and includes the four suggested markets plus other industries. Which packs are commercially in v1 is still open.
- Hierarchy depth cap and default role names per industry
- Default escalation recipient per v1 industry
- Staff health v1 weights (needed for P2, not for starting P1)
- GPS retention and consent UX (P2)
- Transaction Junction KYC level (P4)
- Mini-apps at launch: none, or a few partner APIs (P4)
