# Workplace operations platform

Multi-tenant SaaS for companies: tasks, staff accountability, and industry-specific workflows, on web, iOS, and Android. Later phases add attendance, roster, wallet, mini-apps, POS, and CCTV. Those later phases are outside the current build window.

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
| [docs/API-V1.md](docs/API-V1.md) | `/api/v1` route contract |

The web console is Next.js and shadcn. From this folder:

```bash
npm run dev
```

The web app is deployed on Vercel. A single deployment region is not locked, and the mobile toolkit is still open, so iOS and Android are not in this command. Env setup, rollback, and the Invalid API key log are in [docs/RUNBOOK.md](docs/RUNBOOK.md).
