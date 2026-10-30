# Platform Owner console

The platform owner is the product vendor. A company admin only sees one business. The owner sees every business and configures each one.

This does not add a migration. Suspension is stored on `companies.settings.status` (`active` or `suspended`). Billing totals are read from migration `005` when those tables exist and are omitted when they do not.

## Who is an owner

Both checks run on the server. A client flag is never accepted.

1. The signed-in user's email is in `PLATFORM_OWNER_EMAILS` (comma-separated). When that variable is unset or blank, the list is `thoufeeq2009@gmail.com`.
2. Or the user is an `admin` of the company whose slug is `todo-app-hq`.

A manager of that company is not an owner. An admin of any other company is not an owner, unless their email is on the list.

The helper is `src/lib/owner/guard.ts` (`isPlatformOwner`, `authorizeOwner`).

## How to open it

1. Sign in at `/customer-login` with the vendor account (the same customer login the company uses).
2. The company console shows a **Platform Owner** link in the sidebar, in the user menu, and on a banner. That link is rendered only after the server confirms the account.
3. Open `/owner`.

Someone who is not signed in gets HTTP 401. A signed-in company admin who opens `/owner` gets HTTP 403. The same codes are returned by `/api/owner/*` and `/api/v1/owner/*`.

`src/proxy.ts` returns that 401 or 403 for `/owner` document requests before the page streams. With Cache Components, a later `unauthorized()` or `forbidden()` call would keep the HTTP status at 200 and only embed the status in the stream. The proxy check uses the customer session cookie. A missing or malformed cookie does not read the database. A well-shaped cookie is resolved on the server and passed through `authorizeOwner`. The page still calls `requirePageOwner` after the proxy allows it.

After login, a `next` query that starts with `/owner` or `/customer` is followed. Other values are ignored.

Signing up a company named “ToDo App HQ” produces the slug `todo-app-hq`. The first user is an admin, so that account is an owner even if the email list changes.

## Screens

| Path | What it shows |
| --- | --- |
| `/owner` | Totals, signups for 7 and 30 days, a 30-day chart, recent signups, plan counts when billing exists, recent owner audit rows |
| `/owner/tenants` | Searchable table: industry, plan, people, enabled modules, status, created date |
| `/owner/tenants/new` | Create a business and invite its admin |
| `/owner/tenants/[id]` | Read-only summary, profile edit, people, module switches, billing, usage, audit, suspend or reactivate |
| `/owner/industries` | Industry catalogue, default modules, and checklist labels the app already has |
| `/owner/modules` | Module catalogue and how many businesses have each one on |

There is no templates table. Default modules live on `industries.default_modules`. Checklist copy for the first markets lives in `industryLabels`.

Creating a business turns on the industry defaults plus `staff`, `tasks`, and `notifications` when those catalogue rows exist. The admin is invited. Email is not sent. Copy the `/invite/…` link. No password is stored for them until they accept.

Suspending a business refuses sign-in for everyone in it except a platform owner, so the owner can still open this console and turn the business back on. The status is `companies.settings.status`.

## APIs

`/api/owner/*` uses the customer session cookie. `/api/v1/owner/*` uses `Authorization: Bearer`. Both call the same commands. Errors are `{ "error": { "code", "message" } }`. Owner routes are limited to 60 requests a minute per address on `/api/owner`, and they also sit under the `/api/v1` limiter. Inputs are checked before they reach the database. Reads and writes use the service-role client on the server.

| Method | Path |
| --- | --- |
| GET | `/owner/overview` |
| GET | `/owner/tenants` |
| POST | `/owner/tenants` |
| GET | `/owner/tenants/:id` |
| PATCH | `/owner/tenants/:id` |
| GET | `/owner/tenants/:id/audit` |
| PATCH | `/owner/tenants/:id/modules` |
| POST | `/owner/tenants/:id/invitations` |
| GET | `/owner/industries` |
| GET | `/owner/modules` |

Prefix that with `/api` or `/api/v1`. Query `q`, `status` (`all`, `active`, `suspended`), `industryId`, `plan` (`all`, `none`, `starter`, `growth`, `scale`), `limit`, and `offset` filter the tenant list. A plan filter returns an empty list with `billingAvailable: false` when migration 005 is missing.

Every change writes `audit_logs` on that business: `owner.tenant.created`, `owner.tenant.updated`, `owner.tenant.suspended`, `owner.tenant.reactivated`, `owner.module.updated`, `owner.invitation.created`.

List responses cap the company scan at 1,000 rows and say so with `capped`. User passwords are never selected.
