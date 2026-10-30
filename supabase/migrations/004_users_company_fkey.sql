-- PostgREST embeds users -> companies only when this foreign key is in the schema cache.
-- 001 already declares it. This makes the constraint name explicit if a database was created without it.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL OR to_regclass('public.companies') IS NULL THEN
    RAISE NOTICE 'users or companies is missing; skip users_company_id_fkey';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_company_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
