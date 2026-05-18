-- M2.2a: encrypted journal entries. Per HIPAA.md §5 the body is stored
-- as envelope-encrypted ciphertext + a per-row data key (itself wrapped
-- by KMS). Nothing in this table is ever logged or returned to clients
-- in plaintext form; decryption happens in `entryRepo` immediately
-- before the value crosses the workspace boundary.

CREATE TABLE "entry" (
  "id" uuid PRIMARY KEY,
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
  "body_ciphertext" bytea NOT NULL,
  "body_nonce" bytea NOT NULL,
  "body_wrapped_key" bytea NOT NULL,
  "body_aad" text NOT NULL,
  "word_count" integer NOT NULL DEFAULT 0,
  "written_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "entry_workspace_id_idx" ON "entry"("workspace_id");
CREATE INDEX "entry_client_written_idx" ON "entry"("client_id", "written_at" DESC);

-- RLS: workspace_id isolation, same pattern as `client` and `audit_log`.
-- Reader and writer use the same expression because we want INSERTs to
-- also be checked (you can't insert an entry into another workspace).
ALTER TABLE "entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "entry_tenant_isolation" ON "entry"
  USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

-- Make sure the application role can SELECT/INSERT on the new table.
-- (Default privileges from 0003 should cover this, but being explicit
-- here means we never have to chase a "permission denied" mid-migration.)
GRANT SELECT, INSERT, UPDATE, DELETE ON "entry" TO attuna_app;
