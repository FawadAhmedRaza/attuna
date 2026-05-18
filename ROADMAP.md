# Attuna — Roadmap

This is the build order. Each milestone is shippable in isolation. We don't start the next one until the previous is done per CLAUDE.md's "What 'done' means" definition.

Status legend: ✅ done · 🔨 in progress · ⏭ next · 💤 deferred

---

## M0 — Foundations 🔨

The minimum context and scaffolding so future sessions don't drift.

- ✅ Monorepo scaffolded (pnpm + Turborepo, `apps/web`, `packages/ui`)
- ✅ `CLAUDE.md`, `README.md`
- 🔨 `ARCHITECTURE.md` — drafted, awaiting founder sign-off
- ✅ `HIPAA.md` — PHI handling rules, BAA inventory, audit log spec (drafted at M2.0)
- ⏭ `DESIGN_SYSTEM.md` — tokens, type scale, motion, light/dark
- ⏭ `PROMPTS.md` — brief-generation prompts and eval criteria
- ⏭ Initial git commit of scaffolding (currently zero commits on `main`)

**Done when:** all six docs exist, founder has reviewed each, first commit lands.

---

## M1 — Workspace primitive ⏭ (next)

Slack-style workspaces for therapists. **No clients, no journaling, no AI yet.** Just: a therapist can sign up, land in a workspace, invite a teammate, switch workspaces.

### Slice plan

1. **Database foundation**
   - Drizzle setup, RDS-compatible Postgres locally via Docker
   - Migrations: `user`, `workspace`, `workspace_member`, `workspace_invite`
   - RLS scaffolding (policies stubbed; tables that hold PHI will use them in M2+)
   - Repositories: `workspaceRepo`, `memberRepo`, `inviteRepo` — all take a `WorkspaceContext` (except creation flows)

2. **Auth (Cognito)**
   - User pool provisioned via CDK in dev account
   - Email + password with email verification (magic links deferred)
   - Sign-up, sign-in, sign-out flows in `apps/web`
   - On first login, user mirrored into our `user` table

3. **Onboarding → personal workspace**
   - After sign-in, if user has zero workspaces → onboarding creates one with a slug they pick
   - Owner role assigned automatically

4. **Workspace switcher + scoped routes**
   - URL shape `/w/[slug]/...` enforced
   - Sidebar workspace switcher (matches `DESIGN_SYSTEM.md` once written)
   - Active workspace persisted in `atn_ws` signed cookie
   - Middleware: every workspace-scoped request resolves membership, 403s on miss

5. **Member management**
   - `/w/[slug]/settings/members` — list, invite by email, remove, change role
   - Invite email via SES; token is single-use, 7-day expiry, hashed at rest
   - `/invite/[token]` accept page (works signed-out)

6. **Account page**
   - `/account` — list workspaces user belongs to, basic profile (name, email)

### Out of scope for M1

- Channels, DMs, real-time anything (we are not building chat)
- Billing / paid plans
- Audit log (lands in M2 with first PHI tables)
- SSO, SCIM (clinic-tier feature, deferred)
- Workspace deletion / ownership transfer (deferred until requested)

**Done when:** a fresh email can sign up, create a workspace, invite a second email, that second email accepts and lands in the same workspace. Both can switch between any other workspaces they belong to. All routes RLS-scoped or repository-scoped. Tests cover invite token validation, membership checks, and slug uniqueness.

---

## M2 — Clients & entries 💤

Therapist creates client records, client gets a mobile invite, writes journal entries. PHI tables go live; HIPAA controls activate (audit log, KMS, RLS enforced).

## M3 — Brief generation 💤

Bedrock pipeline reads entries, produces seven-area brief. Triggered on real change, not every entry.

## M4 — Therapist authoring 💤

Therapist writes suggestions, applies templates, exports brief PDF.

## M5 — Closed beta 💤

Three real practices. No marketing site yet.

---

## Parking lot (do not start without explicit ask)

- Marketing site
- Admin app (`apps/admin`)
- Pakistan/MENA localization
- Group practice billing
- Native push notifications
- Insurance / EHR integrations
