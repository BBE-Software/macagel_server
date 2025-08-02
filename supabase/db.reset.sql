DO $$
DECLARE
    r RECORD;
BEGIN
    EXECUTE 'SET session_replication_role = replica';

    FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;

    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    FOR r IN (
        SELECT t.typname AS enum_type
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname
    ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.enum_type) || ' CASCADE';
    END LOOP;

    EXECUTE 'SET session_replication_role = origin';
END $$;
