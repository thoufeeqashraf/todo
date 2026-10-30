# API v1 contract

The web app is the control plane. A future mobile client uses this API and does not keep a separate copy of tenant rules. No mobile app is in this repo.

Shared TypeScript types are `src/types/index.ts` (records) and `src/lib/platform-rules.ts` (roles, module names, permissions, provider stubs, and `API_V1_CATALOG`). `GET /api/v1/health` returns that catalogue. Route matching, role floors, and module checks live in `matchApiRoute` and `gateApiRoute`.

Base path: `/api/v1`. Send JSON (`Content-Type: application/json`). Collection reads use `limit` and `offset`.

## Auth

`POST /api/v1/auth/login` with `{ email, password, companySlug? }` returns `{ token, tokenType: "Bearer", expiresAt }`. Send `Authorization: Bearer <token>` on later calls. The token is stored only as a hash. It expires after 7 days.

If the email and password match more than one company, the response is HTTP 409 `company_required` and lists `{ slug, name }` for those companies. Send `companySlug` and try again.

`POST /api/v1/auth/logout` deletes the presented token. `GET /api/v1/auth/me` returns `{ user: { id, email, role, companyId } }`.

The browser login at `/api/auth/customer-login` issues the same kind of token and stores it in the httpOnly `customer_session` cookie. Mobile must not rely on that cookie.

`/login` is the development operator gate. It is not this API. Its cookie is an HMAC signed with `SESSION_SECRET` (set on Vercel; placeholder only in `.env.example`). Customer bearer tokens do not use that secret. If `SESSION_SECRET` is missing, the sign-in form shows a short message and does not print a stack trace.

Login, logout, and invitation accept are limited to 10 requests per minute per client address. Other routes allow 120 per minute. The counter is in memory on each server instance, so it is a basic brake, not a global quota. A limited call returns HTTP 429 `rate_limited` and a `Retry-After` header.

## Bootstrap

`GET /api/v1/bootstrap` is the per-tenant config. It includes the company, industry labels and starter checklists, the signed-in user and role, every module with `enabled`, and provider states. A module that is off is still listed so the client can hide it. Mutating routes reject a disabled module with HTTP 403 `module_disabled`.

## Pagination

Collection `GET` routes accept:

| Query | Rule |
| --- | --- |
| `limit` | Integer 1–100. Default 50. |
| `offset` | Integer ≥ 0. Default 0. |

The body is:

```json
{ "items": [], "page": { "limit": 50, "offset": 0, "hasMore": false } }
```

Some reads add fields next to `items` (wallet balance, map stub, marketplace stub). A bad `limit` or `offset` is HTTP 400 `invalid`.

## Errors

Every failure uses the same object:

```json
{ "error": { "code": "module_disabled", "message": "...", "module": "wallet" } }
```

| Code | HTTP | When |
| --- | --- | --- |
| `invalid` | 400 | Zod rejected the JSON body or query. `issues` lists the fields. |
| `consent_required` | 400 | Location was posted without `consent: true`. |
| `unauthorized` | 401 | Bearer token is missing, expired, or inactive. |
| `forbidden` | 403 | The role cannot perform this action, or the company id is not the token's company. |
| `module_disabled` | 403 | The company has not enabled `module`. |
| `not_found` | 404 | Unknown route, or the row is not in this company (or not visible to this user). |
| `conflict` | 409 | Clock-out with no open clock-in. |
| `company_required` | 409 | Login matches more than one company. |
| `insufficient_funds` | 409 | Manual wallet debit is larger than the ledger balance. |
| `expired` | 410 | Invitation expired. |
| `rate_limited` | 429 | Per-instance limit. `retryAfterSeconds` is set. |
| `not_implemented` | 501 | Wallet top-up stub. `movedMoney` is false. |
| `not_configured` | 503 | Supabase env or migrations are missing. |
| `database` | 500 | The database rejected the query. |
| `internal` | 500 | Unexpected failure. The message does not include a stack. |

A row that belongs to another company is `not_found`, not a hint that it exists.

## Roles

`user` sees their own tasks, incidents, schedules, attendance, and locations. `manager` and `admin` see the company. Creating departments, invitations, shifts, and cameras, and updating incidents, requires `manager`. Audit, geofence setup, wallet adjustments, company settings, and reading another person's wallet require `admin`. A person cannot deactivate themselves or change their own role. A manager cannot edit an admin or grant `admin`.

`POST /api/v1/invitations/accept` is public. The invitation's company must have the `staff` module on, or the call is `module_disabled`.

## Routes

Public:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/health` | Version, whether Supabase is configured, route catalogue. No tenant data. |
| POST | `/api/v1/auth/login` | Issues a bearer token. |
| POST | `/api/v1/invitations/accept` | `{ token, password, firstName, lastName }`. Needs the `staff` module. |

Bearer, company-scoped:

| Method | Path | Module | Who | Notes |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/logout` | — | any | Revokes the presented token. |
| GET | `/api/v1/auth/me` | — | any | Caller id, email, role, company id. |
| GET | `/api/v1/bootstrap` | — | any | Tenant config. |
| GET | `/api/v1/tasks` | `tasks` | any | Paginated. Optional `status`: `todo`, `in_progress`, `completed`, `overdue`. Users see their own tasks. |
| POST | `/api/v1/tasks` | `tasks` | any | `{ title, description?, assignedToId?, dueDate?, priority? }`. Floor staff cannot assign to someone else. |
| GET | `/api/v1/tasks/:id` | `tasks` | any | Hidden rows are `not_found`. |
| PATCH | `/api/v1/tasks/:id` | `tasks` | any | At least one of `title`, `description`, `assignedToId`, `dueDate`, `priority`, `status`. |
| DELETE | `/api/v1/tasks/:id` | `tasks` | manager | |
| GET | `/api/v1/users` | `staff` | any | Paginated directory. No password hashes. |
| GET | `/api/v1/users/:id` | `staff` | any | Same company only. |
| PATCH | `/api/v1/users/:id` | `staff` | manager | `{ role?, isActive?, firstName?, lastName? }`. |
| GET | `/api/v1/staff` | `staff` | any | Same list as `/users`. |
| GET | `/api/v1/staff/:id` | `staff` | any | Same as `/users/:id`. |
| PATCH | `/api/v1/staff/:id` | `staff` | manager | Same as `/users/:id`. |
| GET | `/api/v1/departments` | `staff` | any | Paginated. |
| POST | `/api/v1/departments` | `staff` | manager | `{ name, parentId? }`. |
| POST | `/api/v1/invitations` | `staff` | manager | `{ email, role }`. Returns a path. Email is not sent. |
| GET | `/api/v1/notifications` | `notifications` | any | Paginated. Caller's rows only. Optional `unread=true`. |
| POST | `/api/v1/notifications/read` | `notifications` | any | `{ id }`. |
| POST | `/api/v1/notifications/read-all` | `notifications` | any | Marks the caller's unread rows. |
| GET | `/api/v1/audit` | — | admin | Paginated. |
| GET | `/api/v1/incidents` | `incidents` | any | Paginated. Optional `status`: `open`, `investigating`, `resolved`, `closed`. Users see their own reports. |
| POST | `/api/v1/incidents` | `incidents` | any | `{ title, description?, locationLabel? }`. |
| GET | `/api/v1/incidents/:id` | `incidents` | any | |
| PATCH | `/api/v1/incidents/:id` | `incidents` | manager | `{ title?, description?, locationLabel?, status?, assignedToId? }`. |
| GET | `/api/v1/schedules` | `scheduling` | any | Paginated. Users see their own shifts. |
| POST | `/api/v1/schedules` | `scheduling` | manager | `{ userId, startTime, endTime, shiftType?, notes? }`. `shiftType` is `regular` or `travel`. End must be after start. |
| GET | `/api/v1/schedules/:id` | `scheduling` | any | |
| PATCH | `/api/v1/schedules/:id` | `scheduling` | manager | `{ userId?, startTime?, endTime?, shiftType?, notes?, status? }`. Status: `scheduled`, `started`, `completed`, `cancelled`. |
| DELETE | `/api/v1/schedules/:id` | `scheduling` | manager | |
| GET | `/api/v1/attendance` | `geofence_attendance` | any | Paginated. Users see their own rows. Managers may pass `userId`. |
| POST | `/api/v1/attendance/clock-in` | `geofence_attendance` | any | `{ lat?, lng? }`. JSON object required; `{}` is valid. Server decides inside, outside, travel day, or manual approval. |
| POST | `/api/v1/attendance/clock-out` | `geofence_attendance` | any | `{ lat?, lng? }`. HTTP 409 `conflict` when nothing is open. |
| POST | `/api/v1/attendance/travel-day` | `geofence_attendance` | manager | `{ userId, workDate, reason }`. `workDate` is `YYYY-MM-DD`. The client cannot self-approve. |
| POST | `/api/v1/geofences` | `geofence_attendance` | admin | `{ name, lat, lng, radiusMeters }`. |
| GET | `/api/v1/staff-health` | `staff_health` | manager | Paginated scores. Optional `userId`. Provisional weights, not an AI model. |
| POST | `/api/v1/staff-health` | `staff_health` | manager | `{ userId, kind, note? }`. `kind`: `miss`, `late`, `proof_rejected`, `complete`. |
| GET | `/api/v1/wallet` | `wallet` | any | Caller's ledger only. Does not open an account. Adds `balanceCents`, `account`, and `topUp` (`movedMoney: false`). |
| GET | `/api/v1/wallet/entries` | `wallet` | any | Paginated entries plus `balanceCents`. Admin may pass `userId` for someone in the same company. |
| POST | `/api/v1/wallet/adjustment` | `wallet` | admin | `{ amountCents, direction, memo }`. Bookkeeping entry. Not a card charge. |
| POST | `/api/v1/wallet/top-up` | `wallet` | any | Stub. HTTP 501. `movedMoney` is false. |
| GET | `/api/v1/pos/orders` | `pos` | any | Paginated. Orders stay `unpaid`. |
| POST | `/api/v1/pos/orders` | `pos` | any | `{ tableLabel, items, totalCents }`. |
| GET | `/api/v1/cctv/cameras` | `cctv` | any | Paginated registry. Each item's `stream.streamUrl` is null. |
| POST | `/api/v1/cctv/cameras` | `cctv` | manager | `{ name, siteLabel? }`. |
| GET | `/api/v1/mini-apps` | `mini_apps` | any | Paginated `items`, plus an empty `marketplace`. No partner API. |
| GET | `/api/v1/locations` | `find_my_staff` | any | Paginated consented points. `map.tileUrl` is null. Users see their own points. |
| POST | `/api/v1/locations` | `find_my_staff` | any | `{ lat, lng, consent: true }`. |
| GET | `/api/v1/reports/summary` | `reports` | any | Task counts. Partial. |
| GET | `/api/v1/onboarding` | — | any | Checklist from stored company data. |
| GET | `/api/v1/settings` | — | any | Company name, slug, region, settings. |
| PATCH | `/api/v1/settings` | — | admin | `{ name?, region? }`. Region is `za`, `eu`, or `multi`. |

## Platform owner

`/api/v1/owner/*` is the vendor control plane for a future mobile client. It uses the same bearer token as the rest of v1, then checks the platform-owner rule on the server. A company admin receives HTTP 403 `forbidden`. A missing token is HTTP 401. The routes, the cookie API at `/api/owner`, and the suspension flag are described in `docs/OWNER-CONSOLE.md`. These routes are not gated by a company module.

| Method | Path |
| --- | --- |
| GET | `/api/v1/owner/overview` |
| GET, POST | `/api/v1/owner/tenants` |
| GET, PATCH | `/api/v1/owner/tenants/:id` |
| GET | `/api/v1/owner/tenants/:id/audit` |
| PATCH | `/api/v1/owner/tenants/:id/modules` |
| POST | `/api/v1/owner/tenants/:id/invitations` |
| GET | `/api/v1/owner/industries` |
| GET | `/api/v1/owner/modules` |

## Providers

Payments name `transaction_junction`, maps, CCTV, and email are `stub` or `not_connected`. None of them are called. Do not treat a stub response as a completed payment, stream, or email.

## Security headers

`next.config.ts` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and a CSP of `frame-ancestors 'none'; base-uri 'self'; object-src 'none'` on every path. `/api/*` also sends `Cache-Control: no-store`.
