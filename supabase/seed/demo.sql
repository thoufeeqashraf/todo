-- Idempotent demo tenant. Safe to run twice.
-- Creates company slug demo-kitchen only.
-- Does not insert, update, or delete rows for any other company.
-- If slug demo-kitchen already belongs to a company whose settings.purpose is not demo,
-- this script stops and writes nothing.
--
-- Local sign-in for every demo user, if you choose to try it:
--   password: demo-kitchen-local
-- Do not run this seed on a production project.

DO $$
BEGIN
  IF to_regclass('public.companies') IS NULL OR to_regclass('public.industries') IS NULL THEN
    RAISE EXCEPTION 'Apply migrations 001-003 before supabase/seed/demo.sql';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.industries WHERE name = 'restaurant') THEN
    RAISE EXCEPTION 'restaurant industry is missing; apply migration 001 before the demo seed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.companies
    WHERE slug = 'demo-kitchen'
      AND COALESCE(settings->>'purpose', '') <> 'demo'
  ) THEN
    RAISE EXCEPTION 'slug demo-kitchen belongs to a non-demo company; seed will not write to it';
  END IF;
END $$;

INSERT INTO public.companies (name, slug, industry_id, region, settings)
SELECT
  'Demo Kitchen',
  'demo-kitchen',
  industries.id,
  'za',
  jsonb_build_object(
    'purpose', 'demo',
    'note', 'Seeded sample tenant. Not an operator company and not a real customer admin company.'
  )
FROM public.industries
WHERE industries.name = 'restaurant'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.users (
  id, company_id, email, password_hash, first_name, last_name, role, is_active
)
SELECT
  seed.id,
  companies.id,
  seed.email,
  '$2a$10$pqfVVKx.68pdRlabgYT/.eJC9I230R82fnaQitn5Zaxr7A5HE5MfO',
  seed.first_name,
  seed.last_name,
  seed.role,
  true
FROM public.companies
JOIN (
  VALUES
    ('11111111-1111-4111-8111-111111111111'::uuid, 'aya.mokoena@demo-kitchen.example', 'Aya', 'Mokoena', 'admin'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'johan.pietersen@demo-kitchen.example', 'Johan', 'Pietersen', 'manager'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'lerato.dlamini@demo-kitchen.example', 'Lerato', 'Dlamini', 'user'),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'sam.naidoo@demo-kitchen.example', 'Sam', 'Naidoo', 'user')
) AS seed(id, email, first_name, last_name, role) ON true
WHERE companies.slug = 'demo-kitchen'
  AND companies.settings->>'purpose' = 'demo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.company_id = companies.id
      AND (users.id = seed.id OR users.email = seed.email)
  );

INSERT INTO public.departments (id, company_id, name, manager_id)
SELECT
  seed.id,
  companies.id,
  seed.name,
  users.id
FROM public.companies
JOIN (
  VALUES
    ('55555555-5555-4555-8555-555555555555'::uuid, 'Kitchen', 'johan.pietersen@demo-kitchen.example'),
    ('66666666-6666-4666-8666-666666666666'::uuid, 'Front of house', 'aya.mokoena@demo-kitchen.example')
) AS seed(id, name, manager_email) ON true
JOIN public.users
  ON users.company_id = companies.id
 AND users.email = seed.manager_email
WHERE companies.slug = 'demo-kitchen'
  AND companies.settings->>'purpose' = 'demo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.departments
    WHERE departments.company_id = companies.id
      AND (departments.id = seed.id OR departments.name = seed.name)
  );

INSERT INTO public.company_modules (company_id, module_id, is_enabled)
SELECT companies.id, modules.id, true
FROM public.companies
JOIN public.modules
  ON modules.name IN ('tasks', 'staff', 'scheduling', 'inventory', 'incidents', 'notifications', 'reports')
WHERE companies.slug = 'demo-kitchen'
  AND companies.settings->>'purpose' = 'demo'
ON CONFLICT (company_id, module_id) DO NOTHING;

INSERT INTO public.tasks (
  id, company_id, title, description, assigned_to_id, assigned_by_id, department_id,
  due_date, status, priority, completed_at
)
SELECT
  seed.id,
  companies.id,
  seed.title,
  seed.description,
  assignee.id,
  assigner.id,
  departments.id,
  seed.due_date,
  seed.status,
  seed.priority,
  seed.completed_at
FROM public.companies
JOIN (
  VALUES
    (
      '77777777-7777-4777-8777-777777777777'::uuid,
      'Close the lunch pass',
      'Photograph the pass line before the lunch seating ends.',
      'lerato.dlamini@demo-kitchen.example',
      'johan.pietersen@demo-kitchen.example',
      'Kitchen',
      TIMESTAMPTZ '2026-10-31 14:00:00+02',
      'in_progress',
      'high',
      NULL::timestamptz
    ),
    (
      '88888888-8888-4888-8888-888888888888'::uuid,
      'Opening checklist',
      'Two items are still open before the first seating.',
      'sam.naidoo@demo-kitchen.example',
      'aya.mokoena@demo-kitchen.example',
      'Front of house',
      TIMESTAMPTZ '2026-10-31 11:00:00+02',
      'todo',
      'medium',
      NULL::timestamptz
    ),
    (
      '99999999-9999-4999-8999-999999999999'::uuid,
      'Log the cold-room temperature',
      'Morning reading is in the log book.',
      'lerato.dlamini@demo-kitchen.example',
      'johan.pietersen@demo-kitchen.example',
      'Kitchen',
      TIMESTAMPTZ '2026-10-30 09:00:00+02',
      'completed',
      'low',
      TIMESTAMPTZ '2026-10-30 08:40:00+02'
    )
) AS seed(id, title, description, assignee_email, assigner_email, department_name, due_date, status, priority, completed_at)
  ON true
JOIN public.users AS assignee
  ON assignee.company_id = companies.id
 AND assignee.email = seed.assignee_email
JOIN public.users AS assigner
  ON assigner.company_id = companies.id
 AND assigner.email = seed.assigner_email
JOIN public.departments
  ON departments.company_id = companies.id
 AND departments.name = seed.department_name
WHERE companies.slug = 'demo-kitchen'
  AND companies.settings->>'purpose' = 'demo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.company_id = companies.id
      AND (tasks.id = seed.id OR tasks.title = seed.title)
  );

INSERT INTO public.task_comments (id, task_id, user_id, comment)
SELECT
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  tasks.id,
  users.id,
  'The pass photo is still missing. I will take it before 14:00.'
FROM public.tasks
JOIN public.companies ON companies.id = tasks.company_id
JOIN public.users
  ON users.company_id = companies.id
 AND users.email = 'lerato.dlamini@demo-kitchen.example'
WHERE companies.slug = 'demo-kitchen'
  AND companies.settings->>'purpose' = 'demo'
  AND tasks.title = 'Close the lunch pass'
  AND NOT EXISTS (
    SELECT 1
    FROM public.task_comments
    WHERE task_comments.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
       OR (task_comments.task_id = tasks.id AND task_comments.comment = 'The pass photo is still missing. I will take it before 14:00.')
  );

INSERT INTO public.schedules (
  id, company_id, user_id, department_id, start_time, end_time, shift_type, status, notes
)
SELECT
  seed.id,
  companies.id,
  users.id,
  departments.id,
  seed.start_time,
  seed.end_time,
  'regular',
  seed.status,
  seed.notes
FROM public.companies
JOIN (
  VALUES
    (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'lerato.dlamini@demo-kitchen.example',
      'Kitchen',
      TIMESTAMPTZ '2026-10-31 08:00:00+02',
      TIMESTAMPTZ '2026-10-31 16:00:00+02',
      'scheduled',
      'Saturday lunch prep.'
    ),
    (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
      'sam.naidoo@demo-kitchen.example',
      'Front of house',
      TIMESTAMPTZ '2026-10-31 10:00:00+02',
      TIMESTAMPTZ '2026-10-31 18:00:00+02',
      'scheduled',
      'Floor for the first seating.'
    ),
    (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,
      'johan.pietersen@demo-kitchen.example',
      'Kitchen',
      TIMESTAMPTZ '2026-10-31 07:00:00+02',
      TIMESTAMPTZ '2026-10-31 15:00:00+02',
      'scheduled',
      'Kitchen lead.'
    )
) AS seed(id, email, department_name, start_time, end_time, status, notes) ON true
JOIN public.users
  ON users.company_id = companies.id
 AND users.email = seed.email
JOIN public.departments
  ON departments.company_id = companies.id
 AND departments.name = seed.department_name
WHERE companies.slug = 'demo-kitchen'
  AND companies.settings->>'purpose' = 'demo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.schedules
    WHERE schedules.company_id = companies.id
      AND (
        schedules.id = seed.id
        OR (schedules.user_id = users.id AND schedules.start_time = seed.start_time)
      )
  );

INSERT INTO public.incidents (
  id, company_id, title, description, status, location_label, reported_by, assigned_to
)
SELECT
  seed.id,
  companies.id,
  seed.title,
  seed.description,
  'open',
  seed.location_label,
  reporter.id,
  assignee.id
FROM public.companies
JOIN (
  VALUES
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid,
      'Walk-in cooler door not sealing',
      'The gasket on the walk-in is warm to the touch.',
      'Kitchen',
      'lerato.dlamini@demo-kitchen.example',
      'johan.pietersen@demo-kitchen.example'
    ),
    (
      'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid,
      'Wet floor at the pass',
      'A drip from the pass shelf is on the tiles.',
      'Pass',
      'sam.naidoo@demo-kitchen.example',
      'johan.pietersen@demo-kitchen.example'
    )
) AS seed(id, title, description, location_label, reporter_email, assignee_email) ON true
JOIN public.users AS reporter
  ON reporter.company_id = companies.id
 AND reporter.email = seed.reporter_email
JOIN public.users AS assignee
  ON assignee.company_id = companies.id
 AND assignee.email = seed.assignee_email
WHERE companies.slug = 'demo-kitchen'
  AND companies.settings->>'purpose' = 'demo'
  AND NOT EXISTS (
    SELECT 1
    FROM public.incidents
    WHERE incidents.company_id = companies.id
      AND (incidents.id = seed.id OR incidents.title = seed.title)
  );

DO $$
DECLARE
  demo_id uuid;
  n_users integer;
  n_tasks integer;
  n_schedules integer;
  n_incidents integer;
  n_other integer;
BEGIN
  SELECT id INTO demo_id
  FROM public.companies
  WHERE slug = 'demo-kitchen'
    AND settings->>'purpose' = 'demo';

  IF demo_id IS NULL THEN
    RAISE EXCEPTION 'demo-kitchen was not created';
  END IF;

  SELECT count(*) INTO n_users FROM public.users WHERE company_id = demo_id;
  SELECT count(*) INTO n_tasks FROM public.tasks WHERE company_id = demo_id;
  SELECT count(*) INTO n_schedules FROM public.schedules WHERE company_id = demo_id;
  SELECT count(*) INTO n_incidents FROM public.incidents WHERE company_id = demo_id;
  SELECT count(*) INTO n_other
  FROM public.users
  WHERE email LIKE '%@demo-kitchen.example'
    AND company_id <> demo_id;

  IF n_users < 4 OR n_tasks < 3 OR n_schedules < 3 OR n_incidents < 2 THEN
    RAISE EXCEPTION
      'demo-kitchen seed is incomplete (users %, tasks %, schedules %, incidents %)',
      n_users, n_tasks, n_schedules, n_incidents;
  END IF;
  IF n_other <> 0 THEN
    RAISE EXCEPTION 'demo staff emails exist on a company other than demo-kitchen';
  END IF;
END $$;
