# Attuna — Architecture

This document records the foundational technical decisions. If a future change deviates from anything here, it must be discussed with the founder and this document updated in the same PR.

Status legend:

- **DECIDED** — locked, change requires explicit approval
- **PROPOSED** — Claude's recommendation, awaiting founder sign-off
- **OPEN** — not yet chosen, do not assume

---

## 1. Stack

| Layer            | Choice                                              | Status   |
| ---------------- | --------------------------------------------------- | -------- |
| Monorepo         | pnpm workspaces + Turborepo                         | DECIDED  |
| Therapist portal | Next.js 15 (App Router, RSC by default)             | DECIDED  |
| Mobile client    | Expo / React Native                                 | DECIDED  |
| API              | Hono on AWS Lambda (HTTP) for MVP, Fargate at scale | PROPOSED |
| Database         | Postgres on AWS RDS (Docker locally)                | DECIDED  |
| ORM              | Drizzle                                             | DECIDED  |
| Auth             | AWS Cognito User Pools                              | DECIDED  |
| Storage (PHI)    | S3 with KMS-CMK envelope encryption                 | PROPOSED |
| Email            | AWS SES                                             | PROPOSED |
| AI inference     | AWS Bedrock (Anthropic Claude)                      | DECIDED  |
| Infra-as-code    | AWS CDK (TypeScript)                                | PROPOSED |
| Hosting          | AWS only — **not** Vercel (HIPAA BAA required)      | DECIDED  |
| CI               | GitHub Actions                                      | PROPOSED |

### Why these (the non-obvious ones)

- **Cognito over Clerk/WorkOS/Supabase.** AWS-wide BAA covers it, free at MVP scale, no third-party PHI exposure. DX is the worst of the options — accepted cost. Workspaces and memberships live in our own Postgres regardless of auth provider, so this is swappable later.
- **Hono on Lambda over Next.js route handlers for the API.** Keeps the long-running brief-generation worker, mobile API, and web API in one type-safe service. The Next.js portal calls our API just like the mobile app does.
- **Drizzle over Prisma.** Better Postgres feature surface (RLS, partial indexes, generated columns), no separate migration runtime, smaller bundle.

---

## 2. Multi-tenancy model

**Tenant = Workspace.** Every PHI-bearing row carries a `workspace_id` foreign key. Every query is scoped by `workspace_id`. There is no global query path for clinical data.

Two layers of enforcement:

1. **Application layer** — every repository function takes a `WorkspaceContext` and refuses to run without one. No raw `db.select()` calls in feature code; everything goes through repositories.
2. **Database layer** — Postgres Row-Level Security (RLS) policies on every PHI table. The app sets `app.current_workspace_id` per connection; policies reject access to other workspaces. This is belt-and-suspenders against application bugs.

We do **not** use schema-per-tenant or DB-per-tenant. Reasons: too expensive at our scale, painful migrations, and the failure mode of "accidentally read another tenant's data" is no worse with RLS than with separate schemas.

---

## 3. Workspace data model (high level)

```
workspace
  id              uuid pk
  slug            citext unique          -- URL: /w/[slug]
  name            text
  plan            text                   -- 'solo' | 'practice' | ...
  created_at      timestamptz
  // billing fields added when payments land

user
  id              uuid pk                -- one identity, may belong to multiple workspaces
  cognito_sub     text unique
  email           citext unique
  name            text
  created_at      timestamptz

workspace_member
  workspace_id    uuid fk -> workspace
  user_id         uuid fk -> user
  role            text                   -- 'owner' | 'admin' | 'clinician'
  status          text                   -- 'active' | 'invited' | 'removed'
  invited_by      uuid fk -> user (null)
  joined_at       timestamptz (null)
  primary key (workspace_id, user_id)

workspace_invite
  id              uuid pk
  workspace_id    uuid fk -> workspace
  email           citext
  role            text
  token_hash      text                   -- never store the raw token
  expires_at      timestamptz
  accepted_at     timestamptz (null)
  invited_by      uuid fk -> user

workspace_survey                         -- onboarding metadata, no PHI, no RLS
  workspace_id    uuid pk fk -> workspace (cascade)
  license         text (null)            -- therapist credential, not PHI
  practice_type   text                   -- 'solo' | 'group' | 'clinic' | 'training'
  client_count    text (null)            -- '1-10' | '11-25' | '26-50' | '50+'
  specialty       text[]                 -- e.g. ['Anxiety', 'Trauma']
  priorities      text[]                 -- selected insight areas
  created_at      timestamptz
  updated_at      timestamptz
```

Clinical entities (`client`, `entry`, `brief`, `suggestion`, `template`) all carry `workspace_id` and are protected by RLS.

### Roles (MVP)

- **owner** — only one per workspace; billing, delete workspace, transfer ownership
- **admin** — invite/remove members, edit workspace settings, all clinician powers
- **clinician** — manage own clients, read own briefs, author own suggestions

A clinician cannot read another clinician's clients **even within the same workspace**. This is a clinical-trust requirement, not a HIPAA one. Enforced at the application layer (`client.assigned_clinician_id`), with admin override for legitimate reassignment.

---

## 4. Auth flow

1. Therapist signs up → Cognito creates a `User`, we mirror to our `user` table on first login.
2. First login → if user has no workspace, onboarding creates a personal workspace (uniform model: solo therapist = workspace of one).
3. Session JWT carries `cognito_sub` + `user_id`. **It does not carry `workspace_id`** — the active workspace is chosen per-request from a workspace switcher and stored in a signed, HTTP-only cookie (`atn_ws`).
4. Every API request resolves `(user_id, workspace_id)` → looks up `workspace_member` → if not active, 403. Sets `app.current_workspace_id` for RLS.

Why not put workspace in the JWT: switching workspaces would require a token refresh round-trip, and stale JWTs would let removed members keep access until expiry. Cookie + per-request membership check is faster to invalidate.

---

## 5. URL shape

- Marketing / signed-out: `/`, `/pricing`, `/login`
- Workspace-scoped: `/w/[slug]/clients`, `/w/[slug]/briefs/[id]`, `/w/[slug]/settings/members`
- Account-level (no workspace): `/account` (profile, change email, list workspaces)
- Invite acceptance: `/invite/[token]` — signed-out flow if needed

The slug is mutable but unique. We redirect old slugs to new ones for 30 days after rename.

---

## 6. Environments

- **dev** — local Postgres in Docker, LocalStack-free (we hit real AWS dev account for Cognito/SES/S3/Bedrock; cheap)
- **staging** — full AWS account, no real PHI, seed data only
- **prod** — full AWS account, BAA in place, no developer SSH access

No PHI is ever copied from prod to staging or dev. Period.

---

## 7. PHI boundary

- **In-bounds for PHI:** RDS, S3 (KMS-CMK), Bedrock (BAA-covered models only), SES (transactional email containing client names is borderline; we keep client identifiers out of email subject lines and bodies — links only)
- **Out-of-bounds:** logs (Sentry, CloudWatch — scrub before send), analytics (PostHog/Mixpanel/etc), error reporters, feature-flag providers, any LLM provider without a BAA

Detail lives in `HIPAA.md` (to be written).

---

## 8. Open decisions

- Mobile auth flow — Cognito on RN works but Hosted UI is rough; may need custom client
- Push notifications — APNs/FCM directly vs SNS Mobile Push; revisit when notifier service starts
- Background jobs — Lambda + EventBridge vs SQS vs Step Functions for brief generation pipeline
- Search — Postgres full-text suffices for MVP; revisit at first scaling pain
- Feature flags — likely just a `feature_flag` table; no third-party until we feel pain

---

## 9. What this document is not

This is not a deployment runbook, not a security policy, not a data dictionary. Those live in `HIPAA.md`, `RUNBOOK.md`, and the Drizzle schema respectively (and don't all exist yet).
