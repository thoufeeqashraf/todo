-- Indexes, updated_at triggers, and row level security.
-- Safe to run twice. Skips missing tables. Does not replace 004_users_company_fkey.sql.
--
-- The app reads and writes with the Supabase service role, which bypasses row level security.
-- This file does not ALTER that role, does not FORCE ROW LEVEL SECURITY (that would also
-- bind the table owner), and does not create a policy for service_role.
-- anon and authenticated receive no permissive policy and an explicit deny.

CREATE OR REPLACE FUNCTION public.touch_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.touch_row_updated_at() IS
  'Sets updated_at before update. Invoker rights. Not used for authorization.';

-- company_id and foreign-key indexes. Names already created in 001-003 are repeated
-- with IF NOT EXISTS so a repaired database still converges. Unique constraints that
-- already lead with company_id are not duplicated:
--   travel_exceptions (company_id, user_id, work_date)
--   wallet_accounts (company_id, user_id)
-- staff_locations (company_id, recorded_at) already covers company_id.
-- tasks.department_id has no REFERENCES clause in 002; it is still indexed.

DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('users', 'idx_users_company_id', 'company_id'),
      ('companies', 'idx_companies_industry_id', 'industry_id'),
      ('company_modules', 'idx_company_modules_company_id', 'company_id'),
      ('company_modules', 'idx_company_modules_module_id', 'module_id'),
      ('tasks', 'idx_tasks_company_id', 'company_id'),
      ('tasks', 'idx_tasks_assigned_to_id', 'assigned_to_id'),
      ('tasks', 'idx_tasks_assigned_by_id', 'assigned_by_id'),
      ('tasks', 'idx_tasks_department_id', 'department_id'),
      ('task_comments', 'idx_task_comments_task_id', 'task_id'),
      ('task_comments', 'idx_task_comments_user_id', 'user_id'),
      ('task_media', 'idx_task_media_task_id', 'task_id'),
      ('task_media', 'idx_task_media_user_id', 'user_id'),
      ('departments', 'idx_departments_company_id', 'company_id'),
      ('departments', 'idx_departments_parent_id', 'parent_id'),
      ('departments', 'idx_departments_manager_id', 'manager_id'),
      ('teams', 'idx_teams_company_id', 'company_id'),
      ('teams', 'idx_teams_department_id', 'department_id'),
      ('teams', 'idx_teams_manager_id', 'manager_id'),
      ('team_members', 'idx_team_members_team_id', 'team_id'),
      ('team_members', 'idx_team_members_user_id', 'user_id'),
      ('invitations', 'idx_invitations_company_id', 'company_id'),
      ('invitations', 'idx_invitations_invited_by_id', 'invited_by_id'),
      ('invitations', 'idx_invitations_department_id', 'department_id'),
      ('invitations', 'idx_invitations_team_id', 'team_id'),
      ('schedules', 'idx_schedules_company_id', 'company_id'),
      ('schedules', 'idx_schedules_user_id', 'user_id'),
      ('schedules', 'idx_schedules_department_id', 'department_id'),
      ('attendance', 'idx_attendance_company_id', 'company_id'),
      ('attendance', 'idx_attendance_user_id', 'user_id'),
      ('attendance', 'idx_attendance_schedule_id', 'schedule_id'),
      ('audit_logs', 'idx_audit_logs_company_id', 'company_id'),
      ('audit_logs', 'idx_audit_logs_user_id', 'user_id'),
      ('notifications', 'idx_notifications_company_id', 'company_id'),
      ('notifications', 'idx_notifications_user_id', 'user_id'),
      ('api_tokens', 'idx_api_tokens_company', 'company_id'),
      ('api_tokens', 'idx_api_tokens_user_id', 'user_id'),
      ('incidents', 'idx_incidents_company', 'company_id'),
      ('incidents', 'idx_incidents_reported_by', 'reported_by'),
      ('incidents', 'idx_incidents_assigned_to', 'assigned_to'),
      ('staff_health_events', 'idx_staff_health_company', 'company_id'),
      ('staff_health_events', 'idx_staff_health_user_id', 'user_id'),
      ('staff_health_events', 'idx_staff_health_created_by', 'created_by'),
      ('geofences', 'idx_geofences_company', 'company_id'),
      ('travel_exceptions', 'idx_travel_exceptions_user_id', 'user_id'),
      ('travel_exceptions', 'idx_travel_exceptions_approved_by', 'approved_by'),
      ('wallet_accounts', 'idx_wallet_accounts_user_id', 'user_id'),
      ('wallet_entries', 'idx_wallet_entries_company_id', 'company_id'),
      ('wallet_entries', 'idx_wallet_entries_account', 'account_id'),
      ('wallet_entries', 'idx_wallet_entries_created_by', 'created_by'),
      ('staff_locations', 'idx_staff_locations_company', 'company_id, recorded_at'),
      ('staff_locations', 'idx_staff_locations_user_id', 'user_id'),
      ('cameras', 'idx_cameras_company', 'company_id'),
      ('pos_orders', 'idx_pos_orders_company', 'company_id'),
      ('pos_orders', 'idx_pos_orders_created_by', 'created_by'),
      ('mini_apps', 'idx_mini_apps_company_id', 'company_id')
    ) AS v(tbl, idx, cols)
  LOOP
    IF to_regclass('public.' || spec.tbl) IS NULL THEN
      RAISE NOTICE 'skip index %; missing table %', spec.idx, spec.tbl;
      CONTINUE;
    END IF;
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)',
      spec.idx,
      spec.tbl,
      spec.cols
    );
  END LOOP;
END $$;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'industries',
    'companies',
    'users',
    'modules',
    'company_modules',
    'tasks',
    'task_comments',
    'task_media',
    'departments',
    'teams',
    'team_members',
    'invitations',
    'schedules',
    'attendance',
    'audit_logs',
    'notifications',
    'api_tokens',
    'incidents',
    'staff_health_events',
    'geofences',
    'travel_exceptions',
    'wallet_accounts',
    'wallet_entries',
    'staff_locations',
    'cameras',
    'pos_orders',
    'mini_apps'
  ];
  has_anon boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  has_authenticated boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      RAISE NOTICE 'skip row level security; missing table %', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    IF has_anon THEN
      EXECUTE format('DROP POLICY IF EXISTS deny_anon_all ON public.%I', tbl);
      EXECUTE format(
        'CREATE POLICY deny_anon_all ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)',
        tbl
      );
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl);
    ELSE
      RAISE NOTICE 'role anon is missing; row level security on % still defaults to deny', tbl;
    END IF;

    IF has_authenticated THEN
      EXECUTE format('DROP POLICY IF EXISTS deny_authenticated_all ON public.%I', tbl);
      EXECUTE format(
        'CREATE POLICY deny_authenticated_all ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false)',
        tbl
      );
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', tbl);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'industries',
    'companies',
    'users',
    'modules',
    'company_modules',
    'tasks',
    'departments',
    'teams',
    'schedules',
    'incidents'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      RAISE NOTICE 'skip updated_at trigger; missing table %', tbl;
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'updated_at'
    ) THEN
      RAISE NOTICE 'skip updated_at trigger; % has no updated_at column', tbl;
      CONTINUE;
    END IF;
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      'trg_' || tbl || '_updated_at',
      tbl
    );
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.touch_row_updated_at()',
      'trg_' || tbl || '_updated_at',
      tbl
    );
  END LOOP;
END $$;
