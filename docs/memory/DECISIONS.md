# Decisions

Locked choices. Newest first. Change a row only when the user replaces the decision, and note the date.

| Date | Decision | Status |
| --- | --- | --- |
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

- Product name
- Stack: web framework, mobile toolkit (React Native or Flutter are examples only), shared-code approach
- Single deployment region, if one is required later. Company data region is already `za`, `eu`, or `multi`.
- v1 industry packs. The signup catalogue is configuration data and includes the four suggested markets plus other industries. Which packs are commercially in v1 is still open.
- Hierarchy depth cap and default role names per industry
- Default escalation recipient per v1 industry
- Staff health v1 weights (needed for P2, not for starting P1)
- GPS retention and consent UX (P2)
- Transaction Junction KYC level (P4)
- Mini-apps at launch: none, or a few partner APIs (P4)
