# Runbook

Last updated: 30 Oct 2026. Env names match `.env.example`. Do not commit real keys. Do not print secret values into logs, tickets, or docs.

## Environment variables

| Name | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Customer data | Project URL, `https://…`. Inlined at build time on Vercel. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The public Supabase client | Listed in `.env.example` and in the customer config card. Current server routes use the service role client, not this one. Still set it from the same project so the public client is not a placeholder if something imports it. |
| `SUPABASE_SERVICE_ROLE_KEY` | Every customer read and write | Server only. `isSupabaseConfigured()` checks this key and the URL. Bypasses row-level security. Never expose it to the browser or to `NEXT_PUBLIC_*`. |
| `SESSION_SECRET` | Operator cookie at `/login` | Long random string. HMAC key for `admin_session`. Customer bearer tokens do not use it. Placeholder in `.env.example` is not a real secret. The live value is set on Vercel and is not committed. |

Copy `.env.example` to `.env.local` for `npm run dev`. The example values contain `your-project`, `your_supabase`, and `placeholder`-style markers. `isSupabaseConfigured()` treats those markers as not configured.

No other secrets are read. Transaction Junction, maps, CCTV, and email are stubs. The app does not call those networks.

`isSupabaseConfigured()` is true only when all of these hold:

- `NEXT_PUBLIC_SUPABASE_URL` starts with `https://`
- `SUPABASE_SERVICE_ROLE_KEY` is non-empty
- the URL and service role together do not contain `placeholder`, `your_supabase`, or `your-project`

A wrong key that does not contain those words still counts as configured. Supabase then rejects the request. That is the Invalid API key case below.

## Local run

1. Install dependencies with `npm install`.
2. Put the four variables in `.env.local`.
3. In the Supabase SQL editor, run the files in `supabase/migrations` in order: `001_initial_schema.sql`, `002_tasks_and_operations.sql`, `003_platform_modules.sql`, `004_users_company_fkey.sql`. There is no Supabase CLI config in the repo.
4. `npm run dev`. The customer app is `/signup` and `/customer-login`. The operator gate is `/login` and only works when `NODE_ENV` is not `production`.
5. `npm run build` succeeds without the env vars because the Supabase clients are created on first use.

## Deploy

The app is a Next.js project on Vercel. There is no `vercel.json` and no deploy script in the repo.

1. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SESSION_SECRET` on the Vercel environment that will serve the deployment (Preview and Production separately).
2. Apply migrations `001`–`004` on the Supabase project those keys belong to, before sending customer traffic.
3. Deploy from the git integration. `NEXT_PUBLIC_*` is baked in at build, so a change to the URL or anon key needs a new deployment.
4. Production sets `NODE_ENV=production`. `/login` then shows "Sign-in is closed on the live site." Customer signup and `/api/v1` stay available when Supabase is configured.
5. Check `GET /api/v1/health`. `supabaseConfigured` should be true. The body is the route catalogue and contains no tenant data and no secrets.

Do not put service-role or session values in Preview URLs, client bundles, or `NEXT_PUBLIC_` names.

## Rollback

There is no rollback command in this repo. Roll back the web deployment from Vercel:

1. Open the project’s Deployments list.
2. Choose the previous deployment that was Ready and had the env vars you intend to keep.
3. Use that deployment’s rollback or promote action so its URL is the one users hit.

Rolling back the deployment does not roll back the database. Migrations `001`–`004` only add tables, indexes, and seeds (`ON CONFLICT DO NOTHING` on the later module insert). They do not drop data. If a bad migration is applied later, restore from a Supabase backup or run a reviewed down script. Do not invent one in the app.

If a bad env var was the problem, fix the variable, redeploy, and do not reuse the deployment that was built with the wrong `NEXT_PUBLIC_*` value.

## Troubleshooting

The UI hides server detail. `src/app/error.tsx` and `global-error.tsx` say "This page could not load" and "The details stay on the server." Look at the local terminal or the Vercel function log for the Supabase `code`, `message`, `details`, and `hint`.

### Database is not configured

The customer shell card, `GET /api/industries` (503), and tenant errors (`not_configured`, 503) mean `isSupabaseConfigured()` is false. Set the URL and service role, avoid the placeholder words, and redeploy if this is Vercel. The card also names the anon key and migrations `001`–`003`. Apply `004` as well.

### Operator sign-in is not configured

`/login` returns "Operator sign-in is not configured. Set SESSION_SECRET." Generate a new long random string, set it on that Vercel environment, and redeploy. On production the gate is closed even when the secret is set.

### Invalid API key

Supabase returns the message `Invalid API key` when the key sent on the request is not a valid API key for that project. This app does not invent that string. It shows up in server logs.

Where it surfaces:

- `GET /api/industries` logs `Industries fetch error:` and the browser gets "Failed to fetch industries". Signup then cannot list industries.
- Signup logs `Company creation error:` or `User creation error:` and the browser gets "Failed to create company" or "Failed to create user account".
- Customer login logs `loginWithPassword company join failed` or `loginWithPassword user lookup failed` with `message: "Invalid API key"`, then responds with a generic database error ("Could not look up the user.") or "Internal server error".
- Other tenant calls go through `fail()`, which logs the Supabase message and throws `PlatformError` code `database` with a fixed sentence such as "Could not read company modules."

The browser will not show "Invalid API key". Search the function log for that phrase.

Causes that match this code:

1. `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are from different Supabase projects. Current data routes call `supabaseAdmin`, so the service role is the key Supabase checks.
2. The service role value is truncated, wrapped in quotes, or has a leading or trailing space or newline. Vercel stores the value exactly as pasted.
3. The anon key was pasted into `SUPABASE_SERVICE_ROLE_KEY`, or a publishable key was pasted into a field that still expects the service role JWT, and it is not valid for this project URL.
4. The variables are set on Production but the request is a Preview deployment, or the reverse.
5. The URL or anon key changed in the dashboard after the last build. `NEXT_PUBLIC_SUPABASE_URL` is fixed at build time. Redeploy after changing it.
6. A hand-written key does not contain `placeholder`, `your_supabase`, or `your-project`, so the app treats it as configured and sends it.

What to do:

1. In Supabase, open Project Settings → API for the project whose URL is `NEXT_PUBLIC_SUPABASE_URL`.
2. Copy the project URL and the service role key again into Vercel. Paste the anon key into `NEXT_PUBLIC_SUPABASE_ANON_KEY` from that same page.
3. Confirm the values are on the environment that is actually serving traffic.
4. Redeploy. Hit `GET /api/v1/health` and confirm `supabaseConfigured` is true, then load `/signup` so industries return an array.
5. Do not commit the keys. Rotate the service role if it was pasted into a log or a chat.

A missing table is a different error (`relation` does not exist, or a schema-cache message). Apply migrations `001`–`004`. That is not an invalid key.

### Company required

HTTP 409 `company_required` on login means the email and password match more than one company. Send `companySlug` and try again. The slug is chosen at signup from the company name.

### Module is off

HTTP 403 `module_disabled` means the company has not enabled that module. An admin turns it on at `/customer/modules`. Enabling a catalogue-only module does not add a screen.

### Build succeeded, customer pages still empty

A green Vercel build does not mean Supabase is configured. The build skips the clients. Check health, the env vars, and the migrations.
