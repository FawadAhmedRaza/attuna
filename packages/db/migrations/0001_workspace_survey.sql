-- Onboarding survey answers, keyed 1:1 to workspace.
-- No PHI here (practice metadata only), so no RLS.

CREATE TABLE "workspace_survey" (
  "workspace_id" uuid PRIMARY KEY REFERENCES "workspace"("id") ON DELETE CASCADE,
  "license" text,
  "practice_type" text NOT NULL CHECK ("practice_type" IN ('solo', 'group', 'clinic', 'training')),
  "client_count" text CHECK ("client_count" IS NULL OR "client_count" IN ('1-10', '11-25', '26-50', '50+')),
  "specialty" text[] NOT NULL DEFAULT '{}',
  "priorities" text[] NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
