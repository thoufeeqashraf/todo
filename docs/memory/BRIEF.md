# Product brief

Last updated: 30 Oct 2026. Canonical detail, scenarios, competitors, and quote math live in `DEVELOPMENT-BRIEF.md`. This file is the working summary. If they disagree, the development brief wins until the user edits it.

## What it is

Multi-tenant SaaS for business operations. Companies run tasks, staff accountability, attendance, and industry-specific workflows. Later optional modules add duty rosters, a wallet, a consumer mini-app shell, POS QR ordering, and premium CCTV AI.

Clients: web, iOS, and Android. The web platform has two logins. Admin and staff sign in to control the mobile app and manage the platform. Customers use a different login on the same web to run their business. Mobile is the app those customers use. Inside a customer company, officials use the customer web in depth and frontline people use mobile. A person outside a company staff context eventually gets a consumer mini-app marketplace. That consumer shell is P4.

Commercial model: monthly or yearly subscriptions. Target scale about 100,000 users across many companies.

## Principles that shape the build

- Industry chosen at company registration changes labels, templates, and defaults.
- About 10 staff levels. Higher levels see lower-level people and work. Lower levels see only their own dashboard and assigned work.
- Seniors assign work downward, with deadlines.
- Proof is comments, photos, and videos.
- Three product roles: doer, assigner, overseer.
- Optional modules are off unless the company turns them on. Example: AI duty roster.
- Wallet money movement uses the Transaction Junction API. Do not build a payment gateway.
- GPS, staff scoring, and wallet flows need South African POPIA, labour, and payments review before they ship.

## First markets

Suggested v1 industries, still open at kickoff: restaurants, retail, property / facilities, construction.

Shared core loop: assign, due time, checklist, proof, manager visibility.

## Phase cut

| Phase | In the 30 Oct 2026 – 30 Apr 2027 window? |
| --- | --- |
| P1 Core ops MVP | Yes. This is the build sequence for the window. |
| P2 Control and accountability | Starts only after P1 acceptance. April holds the first slice (escalation and black marks). Staff health, incidents, Find My Staff, and geofence attendance stay after this window unless the timeline is revised. |
| P3 Roster and templates | After this window. Re-quote. |
| P4 Wallet and super-app | After this window. Re-quote. |
| P5 POS QR ordering | After this window. Re-quote. |
| P6 CCTV AI | After this window. Re-quote. |

Quoted P1 is 3,200 hours. One full-time developer for six months is about 960 hours. The calendar sequences P1. It does not mean the quoted hour totals finish on 30 Apr 2027.

Sell P1+P2 first ($210,000 face / $157,500 cash to the developer). Full vision face is $580,000–$620,000. Face rate is $35/hour. If price is pushed, cut scope, not the rate. Deal context recorded in the brief: 75% cash, 25% ownership, no unpaid AMC after settlement.

## Still open

See section 13 of `DEVELOPMENT-BRIEF.md` and the open list in `DECISIONS.md`. Stack and hosting block scaffolding.
