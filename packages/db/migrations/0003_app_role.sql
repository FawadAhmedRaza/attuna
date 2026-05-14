-- RLS only applies to non-superuser roles, and Postgres' default behavior
-- creates the POSTGRES_USER (here: `attuna`) as a superuser. We connect as
-- `attuna` for migrations (which need DDL privileges) and then SET LOCAL
-- ROLE to `attuna_app` inside every `withWorkspaceContext` transaction so
-- the actual reads and writes run with RLS enforced.
--
-- In production, the application's IAM-auth user will already be a
-- non-superuser; this role exists primarily so dev and test environments
-- behave identically to prod. NOBYPASSRLS makes the bypass impossible
-- even if the role is later granted superuser by mistake.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'attuna_app') THEN
    CREATE ROLE attuna_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

-- Schema usage + table privileges. ALTER DEFAULT PRIVILEGES so future
-- migrations don't need to re-grant when they add tables.
GRANT USAGE ON SCHEMA public TO attuna_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO attuna_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO attuna_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO attuna_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO attuna_app;

-- Allow the connection user to assume the app role inside transactions.
-- Without this, `SET LOCAL ROLE attuna_app` fails for non-superusers.
GRANT attuna_app TO attuna;
