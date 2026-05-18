-- M2.2b: invite a client to journal. Separate from workspace_invite (which
-- invites clinicians/admins).
--
-- RLS note: unlike `client`/`entry`/`audit_log`, this table is NOT RLS-
-- protected. The accept path runs signed-out (no workspace context yet)
-- and needs to look the row up by token-hash before any tenant boundary
-- is established. The hashed token itself is the access control for that
-- path; application-layer scoping (clientInviteRepo methods take ctx
-- and filter by workspace_id) protects therapist-side reads. This
-- matches the workspace_invite pattern from M1.5. Email is PHI-adjacent
-- per HIPAA §2 — protection is RDS at-rest encryption + the fact that
-- only hashed tokens enable enumeration.

CREATE TABLE "client_invite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "client"("id") ON DELETE CASCADE,
  "email" citext NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "accepted_at" timestamptz,
  "invited_by" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "client_invite_workspace_idx" ON "client_invite"("workspace_id");
CREATE INDEX "client_invite_client_idx" ON "client_invite"("client_id");
CREATE INDEX "client_invite_email_idx" ON "client_invite"("email");

GRANT SELECT, INSERT, UPDATE, DELETE ON "client_invite" TO attuna_app;
