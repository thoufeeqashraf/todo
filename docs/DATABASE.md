# Database

Apply the SQL files in name order against the Supabase project. There is no local database in this repo. The app uses `SUPABASE_SERVICE_ROLE_KEY` for every read and write (`src/lib/supabase.ts`). The anon key is not a data path.

## Migrations

| File | What it does |
| --- | --- |
| `supabase/migrations/001_initial_schema.sql` | Companies, users, industries, modules. Seeds the industry catalogue and core modules. |
| `supabase/migrations/002_tasks_and_operations.sql` | Tasks, departments, teams, invitations, schedules, attendance, audit, notifications. |
| `supabase/migrations/003_platform_modules.sql` | Later module tables and their module rows. |
| `supabase/migrations/004_users_company_fkey.sql` | Names `users_company_id_fkey` when it is missing, then asks PostgREST to reload. |
| `supabase/migrations/004_indexes_and_rls.sql` | Company and foreign-key indexes, `updated_at` triggers, row level security. |

`004_indexes_and_rls.sql` sorts before `004_users_company_fkey.sql`. They do not depend on each other. Both are safe to run twice.

### Indexes

`CREATE INDEX IF NOT EXISTS` covers `company_id` and each foreign key that did not already have an index. A missing table is skipped with a notice.

These are not given a second index, because an existing unique or composite index already leads with `company_id`:

- `travel_exceptions (company_id, user_id, work_date)`
- `wallet_accounts (company_id, user_id)`
- `staff_locations (company_id, recorded_at)`

`tasks.department_id` is indexed. Migration 002 does not declare a foreign key on that column.

### Row level security

Enabled on every public table from migrations 001–003, including the industry and module catalogues. With no permissive policy, Postgres denies rows. The migration also:

- creates restrictive `deny_anon_all` and `deny_authenticated_all` policies (`USING (false)`, `WITH CHECK (false)`)
- revokes table privileges from `anon` and `authenticated` when those roles exist

The service role is unchanged. The migration does not `FORCE ROW LEVEL SECURITY`, so the table owner used by the SQL editor still bypasses it, and a service role with `BYPASSRLS` still bypasses it. Do not point the browser at the service role key.

### `updated_at`

`public.touch_row_updated_at()` runs `BEFORE UPDATE` on tables that already have `updated_at`: industries, companies, users, modules, company_modules, tasks, departments, teams, schedules, incidents. The trigger is dropped and recreated so a second run is safe. Tables without that column are left alone.

## Demo seed

`supabase/seed/demo.sql` is not part of the migration runner. Apply it by hand after 001–003 when you want sample data.

It inserts one company:

| Field | Value |
| --- | --- |
| Name | Demo Kitchen |
| Slug | `demo-kitchen` |
| Industry | `restaurant` |
| Region | `za` |
| `settings.purpose` | `demo` |

Sample rows, all on that company only:

- Staff: Aya Mokoena (`admin`), Johan Pietersen (`manager`), Lerato Dlamini (`user`), Sam Naidoo (`user`)
- Departments: Kitchen, Front of house
- Tasks: close the lunch pass, opening checklist, cold-room temperature
- One comment on the lunch-pass task
- Three Saturday 31 Oct 2026 shifts
- Two open incidents

Emails are `@demo-kitchen.example`. The shared local password is `demo-kitchen-local`. Do not run the seed on a production project.

The seed refuses to run if slug `demo-kitchen` already belongs to a company whose `settings.purpose` is not `demo`. It never updates or deletes another company. A second run inserts nothing new and then checks that the sample counts are still present.
