# API v1 contract

The web app is the control plane. A future mobile client uses this API and does not keep a separate copy of tenant rules. No mobile app is in this repo.

Shared TypeScript types are `src/types/index.ts` (records) and `src/lib/platform-rules.ts` (roles, module names, permissions, provider stubs, and `API_V1_CATALOG`). `GET /api/v1/health` returns that catalogue.

## Auth

`POST /api/v1/auth/login` with `{ email, password, companySlug? }` returns `{ token, tokenType: "Bearer", expiresAt }`. Send `Authorization: Bearer <token>` on later calls. The token is stored only as a hash. It expires after 7 days.

If the email and password match more than one company, the response is HTTP 409 `company_required` and lists `{ slug, name }` for those companies. Send `companySlug` and try again.

The browser login at `/api/auth/customer-login` issues the same kind of token and stores it in the httpOnly `customer_session` cookie. Mobile must not rely on that cookie.

`/login` is the development operator gate. It is not this API. Its cookie is an HMAC signed with `SESSION_SECRET` (set on Vercel; placeholder only in `.env.example`). Customer bearer tokens do not use that secret. If `SESSION_SECRET` is missing, the sign-in form shows a short message and does not print a stack trace.

## Bootstrap

`GET /api/v1/bootstrap` is the per-tenant config. It includes the company, industry labels and starter checklists, the signed-in user and role, every module with `enabled`, and provider states. A module that is off is still listed so the client can hide it. Mutating routes reject a disabled module with HTTP 403 `module_disabled`.

## Errors

```json
{ "error": { "code": "module_disabled", "message": "...", "module": "wallet" } }
```

`not_configured` (503) means Supabase env or migrations are missing. `unauthorized` (401) means the bearer token is missing or expired.

## Routes

Public:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/health` | Version, whether Supabase is configured, route catalogue. No tenant data. |
| POST | `/api/v1/auth/login` | Issues a bearer token. |
| POST | `/api/v1/invitations/accept` | `{ token, password, firstName, lastName }`. Needs the `staff` module. |

Bearer, company-scoped:

| Method | Path | Module | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/bootstrap` | — | Tenant config. |
| GET, POST | `/api/v1/tasks` | `tasks` | Users see their own tasks. Managers and admins see the company. |
| GET | `/api/v1/users` | `staff` | No password hashes. |
| GET, POST | `/api/v1/departments` | `staff` | Create is manager or admin. |
| POST | `/api/v1/invitations` | `staff` | Returns a path. Email is not sent. |
| GET | `/api/v1/notifications` | `notifications` | In-app rows for the caller. |
| POST | `/api/v1/notifications/read` | `notifications` | `{ id }`. |
| GET | `/api/v1/audit` | — | Admin only. |
| GET, POST | `/api/v1/incidents` | `incidents` | Users see their own reports. |
| GET, POST | `/api/v1/schedules` | `scheduling` | Create is manager or admin. `shiftType` is `regular` or `travel`. |
| POST | `/api/v1/geofences` | `geofence_attendance` | Admin sets the circle. |
| POST | `/api/v1/attendance/travel-day` | `geofence_attendance` | Manager pre-approval. The client cannot self-approve. |
| POST | `/api/v1/attendance/clock-in` | `geofence_attendance` | Server decides inside, outside, travel day, or manual approval. |
| GET, POST | `/api/v1/staff-health` | `staff_health` | Managers and admins. Score weights are provisional, not an AI model. |
| GET | `/api/v1/wallet` | `wallet` | Ledger balance in cents. |
| POST | `/api/v1/wallet/adjustment` | `wallet` | Admin bookkeeping entry. Not a card charge. |
| POST | `/api/v1/wallet/top-up` | `wallet` | Stub. HTTP 501. `movedMoney` is false. |
| GET, POST | `/api/v1/pos/orders` | `pos` | Orders stay `unpaid`. |
| GET, POST | `/api/v1/cctv/cameras` | `cctv` | Registry. `streamUrl` is null. |
| GET | `/api/v1/mini-apps` | `mini_apps` | Empty marketplace. No partner API. |
| GET, POST | `/api/v1/locations` | `find_my_staff` | Stored only when `consent` is true. No map tiles. |
| GET | `/api/v1/reports/summary` | `reports` | Task counts. Partial. |
| GET | `/api/v1/onboarding` | — | Checklist from stored company data. |
| GET, PATCH | `/api/v1/settings` | — | Admin may set `name` and `region` (`za`, `eu`, `multi`). |

## Providers

Payments name `transaction_junction`, maps, CCTV, and email are `stub` or `not_connected`. None of them are called. Do not treat a stub response as a completed payment, stream, or email.
