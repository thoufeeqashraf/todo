# Workplace operations platform

Multi-tenant SaaS for companies: tasks, staff accountability, and industry-specific workflows, on web, iOS, and Android. Later phases add attendance, roster, wallet, mini-apps, POS, and CCTV. Those later phases are outside the current build window. The future mobile client calls [`/api/v1`](docs/API-V1.md). There is no mobile app in this repo.

Planning window: **30 Oct 2026 – 30 Apr 2027**, sequenced as P1. Read these before changing product behavior:

| File | What it holds |
| --- | --- |
| [docs/memory/DEVELOPMENT-BRIEF.md](docs/memory/DEVELOPMENT-BRIEF.md) | Canonical brief, scenarios, quote, and build order |
| [docs/memory/BRIEF.md](docs/memory/BRIEF.md) | Working summary |
| [docs/memory/DECISIONS.md](docs/memory/DECISIONS.md) | Locked choices and open kickoff items |
| [docs/memory/LOG.md](docs/memory/LOG.md) | What has already been done |
| [docs/TIMELINE.md](docs/TIMELINE.md) | Done, in progress, and pending |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Vision, personas, industries, and the module catalogue |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tenants, module gating, auth, Supabase, Vercel, and `/api/v1` |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Tokens, typography, and components in use |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Env vars, deploy, rollback, and the Invalid API key error |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Stubs (maps, CCTV, payments), what comes next, and the mobile app |
| [docs/API-V1.md](docs/API-V1.md) | `/api/v1` route contract. Mobile HTTP contract: every `/api/v1` route |

The web console is Next.js and shadcn.

## Setup

Use Node 22. From this folder:

```bash
npm ci
```

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://…supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. The browser client uses it. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key. API routes use it. Never expose it to the client or commit it. |
| `SESSION_SECRET` | Long random string. HMAC for the development operator cookie at `/login`. Customer bearer tokens do not use it. |

Generate a secret with `openssl rand -base64 32`. Placeholder values are not real keys. If the Supabase URL or service role key is missing or still a placeholder, `/api/v1` returns HTTP 503 `not_configured` and does not invent tenant data.

Apply the SQL in `supabase/migrations` in order (`001`, then `002`, then `003`) on that Supabase project. The API reads those tables.

```bash
npm run dev
```

The web app is deployed on Vercel. A single deployment region is not locked, and the mobile toolkit is still open, so iOS and Android are not in this command. Env setup, rollback, and the Invalid API key log are in [docs/RUNBOOK.md](docs/RUNBOOK.md).

Checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Hosting and the mobile toolkit are still open, so iOS and Android are not in this command.

## Deployment

1. Create a Supabase project and run the three migration files in order.
2. Create a Vercel project from this repo. Do not deploy from `main` until that branch is the one you intend to ship.
3. In the Vercel project settings, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SESSION_SECRET` for Production (and Preview, if previews should talk to a database).
4. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` locally, or let Vercel run `npm run build`.
5. Confirm `GET /api/v1/health` on the deployment. `supabaseConfigured` is true only when the URL and service role key are real.
6. Keep Transaction Junction, maps, CCTV, and email unconfigured. Those providers are stubs and the app does not call them.

The in-memory API rate limit resets when an instance restarts and is not shared across instances. Security headers are set in `next.config.ts`.
