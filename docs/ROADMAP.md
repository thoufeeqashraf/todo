# Roadmap

Last updated: 30 Oct 2026. Dates and checkboxes are `docs/TIMELINE.md`. Scope and quotes are `docs/memory/DEVELOPMENT-BRIEF.md`. This file says what is stubbed, what is only partial, and what comes next. It does not add modules the brief does not name.

Window: 30 Oct 2026 – 30 Apr 2027, sequenced as P1. P2 starts only after P1 acceptance. P3–P6 stay after 30 Apr 2027 unless the timeline is revised.

## Stubbed now

`PROVIDERS` in `src/lib/platform-rules.ts` marks payments, maps, CCTV, and email as `stub`. The app does not call those networks. A stub JSON body is not a completed payment, a map, a stream, or an email.

### Maps

`maps.name` is `none`. Find My Staff stores latitude and longitude only when `consent` is true. `mapProviderStatus()` returns `tileUrl: null`. Geofence clock-in uses the haversine distance in `decideClockIn`. There is no map tile provider, no map UI, and no GPS retention policy. The brief keeps GPS retention and consent UX as an open P2 decision, and it needs a South African POPIA review before it ships.

### CCTV

The `cctv` module is a camera registry: name, site label, provider default `unconfigured`. `cameraStream()` returns `state: "stub"`, `streamUrl: null`. There is no live feed and no AI reference check. That work is P6 in the brief.

### Payments

The payments provider is named `transaction_junction` and `movesMoney` is false. `POST /api/v1/wallet/top-up` returns HTTP 501 with `movedMoney: false`. Admin wallet adjustments write ledger rows in cents and do not charge a card. POS orders stay `payment_status: unpaid`. The brief says wallet money movement uses the Transaction Junction API and that the project must not build a payment gateway. Ledger, webhooks, reconciliation, QR, limits, and KYC are P4. They are not connected.

### Also stubbed

Email (`email.name` is `none`). Staff invitations return a path for an admin to copy. Mini-apps return an empty marketplace and no partner API. Push notifications are not connected. In-app notification rows exist when the `notifications` module is on.

## Partial, not accepted

These have server paths and, in most cases, a customer screen. They are module-gated. They are not the accepted phase in the timeline.

| Area | What exists | What does not |
| --- | --- | --- |
| Tasks | Create and list, assign, due, priority | Checklists as stored work, comments, photo and video proof. Tables `task_comments` and `task_media` exist in migration `002` and have no app writes. |
| Hierarchy | Roles `admin`, `manager`, `user`. Departments with optional parent. | About ten levels. Visibility so higher levels see lower levels and lower levels see only their own work. |
| Dashboards | Customer home and operator preview | Doer, assigner, and overseer dashboards. The operator board is preview data, not live tenants. |
| Notifications | In-app rows and mark-read | Email and push |
| Incidents | Create and list inside the company | Escalation to HR or an industry role, black marks |
| Scheduling | `regular` and `travel` shifts | AI duty roster (P3). Do not implement it during P1. |
| Staff health | Provisional rules score | AI scoring. Weights are not a locked kickoff decision. |
| Attendance | Geofence, clock-in decision, travel exception, and a current `travel` shift | A shipped attendance product. There is no separate manual clock-in request. `manualApproved` follows a `travel_exceptions` row for today. `travelDay` follows a current shift of type `travel`. |
| Find My Staff | Consented coordinates | Map, retention, consent UX |
| Wallet, POS, CCTV, mini-apps | Rows and stubs above | Money movement, kitchen tickets, streams, partner apps |
| Branding | Shared type and the customer sidebar | Per-company logos and colours |

## What comes next

Inside this window, in the timeline’s order:

1. Close the open kickoff items that still block product choices: mobile toolkit, which industry packs are commercially in v1, hierarchy defaults, and default escalation roles. Company region is already `za`, `eu`, or `multi`. Web stack is already Next.js, Tailwind, and shadcn.
2. Company branding (logos and colours).
3. Departments, roles, and hierarchy up to about ten levels, then visibility middleware.
4. Task checklists and proof (comments, photos, videos).
5. Doer, assigner, and overseer dashboards, and a web console that matches those roles. Frontline mobile waits on the toolkit decision.
6. Notifications beyond in-app rows.
7. P1 acceptance: security, POPIA review points, and QA on web and mobile.
8. After that acceptance, the April slice is escalation notify and black marks only.

After 30 Apr 2027, without pulling them forward: the rest of P2 (staff health v1, incidents as a product, Find My Staff, geofence attendance with travel day and manual request), then P3 roster and templates, P4 wallet (Transaction Junction) and the consumer mini-app shell, P5 POS QR ordering, P6 CCTV AI. Hour and price figures stay in the development brief.

## Mobile app

The decision is already locked: ship web, iOS, and Android. Web is the deep console. Mobile is the frontline client. The web app is the control plane. A future mobile client calls `/api/v1` with `Authorization: Bearer`, uses `GET /api/v1/bootstrap` for modules, role, and provider status, and does not enforce a second set of rules. The contract is `docs/API-V1.md`.

No mobile app is scaffolded. Do not add an iOS or Android project until the toolkit (the brief’s examples are React Native or Flutter, and neither is chosen) is an active row in `docs/memory/DECISIONS.md`. The operator login is how admin and staff will control that app. Today `/login` is only the development gate, and it is off in production.
