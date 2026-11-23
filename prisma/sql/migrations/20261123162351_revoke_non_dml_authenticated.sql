-- Supabase / Prisma Space only. Review and apply manually; NOT a D1 migration.
-- Grants do not remove Supabase's default excess privileges. REVOKE does.
-- Existing triggers and foreign keys do not require these client privileges.
BEGIN;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE
  public.core_conversations, public.prisma_conversations, public.prisma_profiles
  FROM authenticated;
-- No DML grants, policies, defaults, data or service_role permissions change.
DO $$
DECLARE tbl text; privilege text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['core_conversations','prisma_conversations','prisma_profiles'] LOOP
    FOREACH privilege IN ARRAY ARRAY['TRUNCATE','TRIGGER','REFERENCES'] LOOP
      IF has_table_privilege('authenticated', 'public.' || tbl, privilege) THEN
        RAISE EXCEPTION 'Inherited privilege remains: %.% (review role grants)', tbl, privilege;
      END IF;
    END LOOP;
  END LOOP;
END $$;
COMMIT;
