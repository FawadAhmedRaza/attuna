-- Initial schema for Attuna M1 (workspace primitive).
--
-- No PHI in these tables. RLS is intentionally NOT enabled here —
-- the pattern lands with the first PHI table in M2 (see
-- packages/db/README.md for the policy template).

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

--> statement-breakpoint
CREATE TABLE "user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cognito_sub" text NOT NULL UNIQUE,
  "email" citext NOT NULL UNIQUE,
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE "workspace" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" citext NOT NULL UNIQUE,
  "name" text NOT NULL,
  "plan" text NOT NULL DEFAULT 'solo',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE "workspace_member" (
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" text NOT NULL CHECK ("role" IN ('owner', 'admin', 'clinician')),
  "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'invited', 'removed')),
  "invited_by" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "joined_at" timestamptz,
  PRIMARY KEY ("workspace_id", "user_id")
);

--> statement-breakpoint
CREATE TABLE "workspace_invite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "email" citext NOT NULL,
  "role" text NOT NULL CHECK ("role" IN ('admin', 'clinician')),
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "accepted_at" timestamptz,
  "invited_by" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE INDEX "workspace_invite_email_idx" ON "workspace_invite"("email");
CREATE INDEX "workspace_invite_workspace_id_idx" ON "workspace_invite"("workspace_id");
