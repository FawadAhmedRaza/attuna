-- M2.3a: a client_user row carries the auth identity for a client. In
-- M2.3a the cognito_sub is NULL — the /c/[token] accept page issues a
-- signed cookie tying the browser to the client_user_id. M2.3b will
-- wire the real Cognito client pool and backfill cognito_sub on
-- existing rows during the migration of that slice.

CREATE TABLE "client_user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
  "cognito_sub" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- One client_user per client. If a client switches devices, we rotate
-- cognito_sub on the same row.
CREATE UNIQUE INDEX "client_user_client_id_unique" ON "client_user"("client_id");
-- Cognito subs are globally unique within the pool. Allow NULL (M2.3a)
-- but enforce uniqueness when set.
CREATE UNIQUE INDEX "client_user_cognito_sub_unique" ON "client_user"("cognito_sub");
CREATE INDEX "client_user_workspace_idx" ON "client_user"("workspace_id");

ALTER TABLE "client_user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_user" FORCE ROW LEVEL SECURITY;
CREATE POLICY "client_user_tenant_isolation" ON "client_user"
  USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "client_user" TO attuna_app;
