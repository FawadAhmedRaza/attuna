-- M2.1: first PHI tables. RLS goes live here.
-- HIPAA.md §5 (encryption tier), §6 (audit log schema + write rules),
-- §8 (access controls) are the spec.
--
-- `FORCE ROW LEVEL SECURITY` is required because the `attuna` DB user is
-- the table owner and owners bypass RLS by default. With FORCE, the policy
-- applies to every role except true superusers (we don't run app code as
-- one). The result: a query that forgets to set `app.current_workspace_id`
-- via `withWorkspaceContext` returns zero rows instead of leaking across
-- tenants — fail-closed.

CREATE TABLE "client" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "assigned_clinician_id" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "display_name" text NOT NULL,
  "invite_email" citext,
  "status" text NOT NULL DEFAULT 'invited' CHECK ("status" IN ('invited', 'active', 'paused', 'archived')),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE INDEX "client_workspace_id_idx" ON "client"("workspace_id");
CREATE INDEX "client_workspace_clinician_idx" ON "client"("workspace_id", "assigned_clinician_id");

ALTER TABLE "client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client" FORCE ROW LEVEL SECURITY;
CREATE POLICY "client_tenant_isolation" ON "client"
  USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

--> statement-breakpoint

CREATE TABLE "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "actor_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "actor_role" text NOT NULL,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" uuid,
  "detail" jsonb,
  "ip" inet,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "audit_log_workspace_created_idx" ON "audit_log"("workspace_id", "created_at" DESC);
CREATE INDEX "audit_log_actor_created_idx" ON "audit_log"("actor_user_id", "created_at" DESC);
CREATE INDEX "audit_log_target_idx" ON "audit_log"("target_type", "target_id");

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_tenant_isolation" ON "audit_log"
  USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);
