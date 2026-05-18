# HIPAA — Attuna's compliance posture

This is the engineering source-of-truth for handling Protected Health Information (PHI) in Attuna. It is not legal advice. It's the spec every PR that touches client data must conform to.

**Status:** v1 (M2.0). Items marked `TBD` need founder/legal sign-off before they ship to production.

If you're reading this, the rules below are constraints, not suggestions. Don't ship anything that violates them. If something is unclear, stop and ask — see CLAUDE.md.

---

## 1. Scope

This document defines:

- **What counts as PHI** in Attuna (§2)
- **Where PHI is allowed to live** and where it is forbidden (§3)
- **Vendors we use** and their BAA status (§4)
- **Encryption requirements** at rest and in transit (§5)
- **Audit logging** — what we record, when, and where it lives (§6)
- **Logs, analytics, error reporters** — the out-of-bounds rules (§7)
- **Access controls** (§8)
- **AI/LLM use** — what can and cannot be sent to Bedrock (§9)
- **Breach posture** — what triggers a breach response (§10)
- **Workforce practices** — passwords, devices, code reviews (§11)
- **Mobile client app** — device storage, push, biometrics (§12)
- **Open items** still requiring sign-off (§13)

Architectural decisions that intersect with HIPAA live in `ARCHITECTURE.md` §7. This document elaborates the engineering rules; the architecture doc captures the structural choices.

---

## 2. What is PHI in Attuna

Under HIPAA, PHI = identifiable health information held or transmitted by a covered entity. In Attuna's data model, treat the following as PHI:

**Clearly PHI (most-protected tier):**

- `client.display_name`, any other client identifying field
- `client.assigned_clinician_id` (linking a person to a therapeutic relationship is health info)
- `entry.body` (journal text — the highest-sensitivity field in the entire system)
- `entry.created_at` (temporal pattern is identifying when combined with other fields)
- `brief.body` and every field inside it (generated from PHI)
- `suggestion.body` written by a therapist that references client content
- Anything attached to a `client_id` foreign key

**PHI-adjacent (protect like PHI):**

- Client email addresses (used for invites)
- Mobile push tokens tied to clients
- Audit log rows that name client_ids (the rows themselves carry PHI through the FK chain)

**Not PHI (by Attuna's design choices):**

- Therapist profile fields (`user.name`, `user.email`, `workspace.name`) — these are workforce identifiers, not patient identifiers
- `workspace_survey.*` — practice metadata about the therapist's business, not about clients
- Therapist license numbers — credential info, not PHI
- Aggregate counts (e.g., "this workspace has 12 clients") — only if they cannot be combined with other fields to reidentify

**Heuristic:** if removing the row would deny a clinician knowledge about a specific patient, it's PHI.

---

## 3. Where PHI is allowed to live

**In-bounds environments for PHI:**

- AWS RDS (Postgres, our primary store) — encrypted at rest with AWS-managed KMS keys; sensitive columns additionally envelope-encrypted with our CMK (see §5)
- AWS S3 — only with a customer-managed KMS key (CMK), bucket-level encryption enforced, no public access
- AWS Bedrock — only Anthropic Claude models that AWS covers under its BAA (see §9)
- AWS SES — only the body/links of transactional email may reference a workspace; **subject lines and unauthenticated email bodies must not contain client identifiers** (see §7)
- AWS CloudWatch logs — only after scrubbing (see §7)
- Within developers' AWS dev/staging environments — only synthetic data; **no production PHI is ever copied to dev or staging**

**Out-of-bounds, no exceptions:**

- Sentry (or any error reporter that ships payloads off-AWS) without scrubbing
- PostHog / Mixpanel / Amplitude / any product-analytics provider
- LaunchDarkly / GrowthBook / any feature-flag provider
- Any LLM API that isn't covered by an AWS BAA (this means: **no direct calls to Anthropic API, OpenAI, Google, etc.**)
- Slack, Discord, email outboxes, GitHub issues, Linear comments — engineers must never paste real PHI into any of these to debug
- Local dev machines, except via the AWS-managed bastion or a developer's own AWS account with no inbound copy of prod data
- Browser localStorage / sessionStorage (this is why we don't cache entries in the client app's browser)
- Any non-Attuna-owned SaaS where we have not signed and stored a BAA

Compliance check on each PR: if the diff introduces a new outbound network call or a new third-party SDK, the reviewer must confirm a BAA exists or the data being sent contains no PHI.

---

## 4. BAA inventory

This is the snapshot of vendors that touch our infrastructure and our BAA status with each. Update this section whenever a BAA is signed or a vendor is added.

| Vendor                  | What we use                                                  | BAA required?                                     | Status                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS                     | RDS, S3, Bedrock, SES, KMS, Cognito, CloudWatch, Lambda, IAM | Yes                                               | Covered by AWS-wide BAA — signed via AWS Artifact (`TBD` until founder downloads + stores it)                                                                    |
| Postmark                | Transactional email                                          | Yes if email body ever contains PHI               | `TBD` — we currently haven't signed. Per §7 we plan to keep PHI out of email bodies, so we may not need it; if any flow contains PHI in email we must sign first |
| GitHub                  | Source hosting only — no PHI in code or PRs                  | No                                                | N/A (PHI never enters source)                                                                                                                                    |
| Vercel                  | Not used. Hosting is AWS-only per ARCHITECTURE §1.           | N/A                                               | N/A                                                                                                                                                              |
| Anthropic (direct API)  | **Not used.** All Claude calls go through Bedrock.           | Yes if used                                       | **Forbidden** — direct Anthropic API is out of bounds                                                                                                            |
| OpenAI / others         | **Not used**                                                 | N/A                                               | **Forbidden**                                                                                                                                                    |
| Sentry                  | Possible future use, scrubbed                                | Yes                                               | `TBD` — not wired yet                                                                                                                                            |
| Stripe                  | Future billing                                               | Likely yes — billing metadata can be PHI-adjacent | `TBD` — not wired yet                                                                                                                                            |
| Apple APNs / Google FCM | Mobile push delivery                                         | Yes — push payloads may contain PHI               | `TBD` — push not wired yet; design payloads to be PHI-free (notification body is generic "New brief ready", actual content fetched in-app over TLS)              |

**Rule:** before wiring a new vendor that could touch PHI, confirm the BAA is signed and the date is recorded above. No exceptions.

---

## 5. Encryption

### At rest

- **RDS:** AWS-managed encryption enabled on the cluster (default for new RDS instances we provision). Backups + snapshots inherit encryption.
- **S3:** Bucket-level encryption with a customer-managed KMS key (CMK), `BucketKeyEnabled: true`. Public access blocked at the account and bucket level.
- **High-sensitivity Postgres columns** — envelope-encrypted with our CMK. The columns that get this treatment in M2+:

  | Column            | Why                                                            |
  | ----------------- | -------------------------------------------------------------- |
  | `entry.body`      | The raw journal text — highest-sensitivity field in the system |
  | `brief.body`      | Generated from PHI, treated as PHI                             |
  | `suggestion.body` | When therapist content references client material              |

  Envelope encryption pattern: per-row data key generated by KMS (`GenerateDataKey`), used to AES-256-GCM encrypt the body, then the encrypted data key is stored alongside the ciphertext. We never store plaintext data keys, and we never log either.

  `client.display_name` is **not** envelope-encrypted in M2 because (a) it's typically a first-name-only or initials display label, and (b) every read would round-trip to KMS, killing performance. RLS + audit log is the protection here. If clinics ask to store full legal names, revisit.

### In transit

- All AWS-internal traffic stays within VPC, no public endpoints for RDS or S3 in prod
- TLS 1.2+ everywhere external — enforced by ALB / CloudFront
- Cognito tokens, our session JWTs, and the `atn_ws` cookie are all `Secure; HttpOnly; SameSite=Lax` in prod
- Mobile app pins to TLS 1.2+ (Expo default); no cleartext HTTP

### Key management

- One KMS CMK per environment (dev / staging / prod). Key aliases: `attuna-phi-{env}`.
- Key rotation: automatic annual rotation enabled.
- Access: only the API service role and the brief-generator service role can `Decrypt` / `GenerateDataKey`. Developer IAM users **cannot decrypt prod CMK** — even the founder. Break-glass requires a signed AWS support case or temporary policy grant with an audit trail.
- No key material ever leaves AWS.

---

## 6. Audit log

Every PHI read and write goes into the audit log. The log is append-only; rows are immutable once written.

### Schema (`audit_log` table — lands in M2.1)

| Column          | Type                        | Notes                                                                                                                                                                                 |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `uuid` PK                   | `gen_random_uuid()`                                                                                                                                                                   |
| `workspace_id`  | `uuid` FK → workspace       | Required; the tenant the action affects                                                                                                                                               |
| `actor_user_id` | `uuid` FK → user (nullable) | Null for system-initiated actions (e.g., scheduled brief generation)                                                                                                                  |
| `actor_role`    | `text`                      | Role at the time of action (`owner`/`admin`/`clinician`/`system`); denormalized so role changes don't rewrite history                                                                 |
| `action`        | `text`                      | Verb-style: `client.read`, `client.create`, `entry.read`, `entry.create`, `brief.read`, `brief.export`, `member.invite`, `member.remove`, `auth.signin`, `auth.signin_failed`         |
| `target_type`   | `text`                      | The entity touched: `client`, `entry`, `brief`, `suggestion`, `member`, `workspace`, `session`                                                                                        |
| `target_id`     | `uuid` (nullable)           | The specific row touched; null for bulk reads                                                                                                                                         |
| `detail`        | `jsonb` (nullable)          | Non-PHI structured detail (e.g., `{"reason": "admin_override", "changed_fields": ["assigned_clinician_id"]}`). **Never put client content, names, emails, or any PHI into `detail`.** |
| `ip`            | `inet` (nullable)           | Source IP from request (best-effort)                                                                                                                                                  |
| `user_agent`    | `text` (nullable)           | First 512 chars of UA                                                                                                                                                                 |
| `created_at`    | `timestamptz`               | `now()` default                                                                                                                                                                       |

Indexes: `(workspace_id, created_at desc)`, `(actor_user_id, created_at desc)`, `(target_type, target_id)`.

### What we log

**Always:**

- Every read of a PHI row (`client.read`, `entry.read`, `brief.read`, etc.)
- Every write of a PHI row (`*.create`, `*.update`, `*.delete`)
- Every authentication event (success and failure)
- Every membership change (`member.invite`, `member.accept`, `member.remove`, `member.role_change`)
- Every workspace administrative action (settings change, integration connect/disconnect, billing change)
- Every brief generation (start, success, failure)
- Every PHI export (PDF, CSV, anything that leaves the system in user-readable form)

**Never:**

- The PHI itself (only references to it via `target_id`)
- Raw request/response bodies
- Passwords, tokens, or session ids (even hashed — just don't)

### Retention

- Audit log retained **6 years** minimum (HIPAA standard for PHI access logs)
- No PII tombstoning of the audit log when a user is deleted — only the user row gets anonymized; audit log keeps the (now-orphaned) `actor_user_id` so trails remain traceable

### Write path

Logs are written by a single helper (`auditRepo.write` — lands in M2.1) that is the only way audit rows get inserted. The helper takes the action context (workspace_id, actor) and the action details and `INSERT`s synchronously inside the same transaction as the PHI operation. If the audit insert fails, the whole transaction rolls back — i.e., **no PHI op may complete without its audit row**.

### Read path

- Admins can view their own workspace's audit log at `/w/[slug]/audit` (M2+)
- No cross-workspace audit queries from the application; cross-workspace queries require direct DB access through the bastion, fully logged at the infrastructure level

---

## 7. Logs, observability, analytics — out-of-bounds rules

**The single rule:** no PHI leaves AWS-BAA boundary in any log line, error message, metric, or analytics event.

### Server-side logs

- `console.log` / `console.error` are allowed only with non-PHI structured data
- Production logs land in CloudWatch (which is in-bounds), but we still scrub at the source — we never rely on "CloudWatch is BAA-covered, so anything goes." The scrub catches accidental Sentry hookup later.
- Patterns to never log:
  - `entry.body`, `brief.body`, `suggestion.body`, `client.display_name`, client emails
  - User-facing error messages that quote back user input verbatim
  - SQL with bound values (use parameterized queries; loggers should redact bound values)

### Client-side logs (web + mobile)

- No PHI in `console.log` — even in dev. Engineers run dev with synthetic data, but the habit of "log everything" is a foot-gun.
- Mobile app must not write PHI to crash reports (Expo's default crash collection — confirm scrubbed before enabling)

### Email

- Subject lines: **no client identifiers**. Use generic subjects like "A new brief is ready" or "Your invitation to Attuna".
- Body: workspace name + a deep link is OK. Therapist name as the sender is OK. Client name in body is **not OK** (the email recipient may not be the therapist themselves).
- Plain-text emails only contain links, never journal content

### Push notifications (mobile)

- Notification payload body must be PHI-free. Use generic copy ("Your therapist sent a suggestion"). The app fetches the actual content over authenticated TLS after the user opens the app.

### Metrics

- CloudWatch metrics and structured logs: only counts and IDs, no string content
- No third-party metrics providers (Datadog, etc.) without a BAA — **none signed at v1**

---

## 8. Access controls

### Application layer

- Multi-tenancy: every PHI table has `workspace_id` and is RLS-protected. The app sets `app.current_workspace_id` per transaction via `withWorkspaceContext` (already implemented).
- Clinician isolation: a clinician can only read clients where `client.assigned_clinician_id = <their user_id>`. Admins can override (logged via `audit_log.action = client.admin_override`).
- Role gates: see `lib/rbac.ts` for the client-facing definitions and `lib/workspace/require.ts` for the server-side enforcement.

### Database layer

- RLS policies on every PHI table — **enabled in M2.1**, before any PHI row is inserted in any environment
- Direct DB access in prod is via a bastion only. Bastion logins are themselves logged at infrastructure level (CloudTrail + session manager logs).
- Developer IAM roles have **no read access** to prod RDS data. Break-glass requires temporary role assumption with explicit reason, time-boxed, audited.

### Network layer

- RDS not publicly reachable
- S3 buckets containing PHI: public access blocked at account and bucket level
- VPC endpoints used for KMS, Bedrock, SES so traffic never traverses the public internet

---

## 9. AI / LLM use

Briefs are generated by Anthropic Claude via **AWS Bedrock**. This is the only AI/LLM path. Direct Anthropic API, OpenAI, Google, etc. are forbidden.

### What we send to Bedrock

- Client journal entries (`entry.body`) for the client whose brief is being generated
- Therapist's prompt configuration (insight priorities, etc.) — workspace metadata, not PHI
- A system prompt (no client content)

### What we ensure

- The Bedrock invocation is scoped to a single workspace_id and a single client_id; we never bulk-send entries across clients in a single call
- The model is one AWS covers under its BAA — check the current list before enabling a new model. **Forbidden:** invoking a non-BAA-covered model even for an internal eval.
- Bedrock's logging is disabled at the model-invocation level for production (`logging.cloudWatchConfig: enabled=false` for the production model alias) — or, if enabled for debugging, the log group is in our PHI-allowed CloudWatch with the same scrubbing rules as application logs.

### What we never do

- Train, fine-tune, or evaluate on real PHI in a way that escapes the BAA boundary. Eval datasets are either synthetic, customer-consented + anonymized, or processed entirely inside Bedrock.
- Cache Bedrock outputs anywhere except the row in our DB that already gets envelope-encrypted (`brief.body`).
- Stream Bedrock output to a service or log that isn't BAA-covered.

---

## 10. Breach posture

A breach is any unauthorized acquisition, access, use, or disclosure of PHI. Examples that constitute a breach:

- A bug that returns one workspace's clients to another workspace's users
- A misconfigured S3 bucket exposing PHI
- A developer pasting real PHI into a Slack channel, GitHub issue, or any 3rd-party tool
- An employee's stolen laptop with prod DB credentials
- A successful credential-stuffing attack against a therapist account

### Response steps (high level — full runbook TBD in `RUNBOOK.md`)

1. Contain — rotate keys, disable affected accounts, take affected service offline if needed.
2. Assess — what was accessed, by whom, when, for how long.
3. Notify — affected covered entities (the therapists) within timeframes required by HIPAA. Founder owns this.
4. Document — incident report in a private repo, no PHI in the report itself (use references only).
5. Remediate — fix the root cause; retro within 1 week.

### Things that are NOT breaches

- An unsuccessful login attempt (logged as `auth.signin_failed`, no PHI exposed)
- A therapist exporting their own clients' briefs (intentional and authorized)
- A clinic admin removing a member (intentional and authorized)

---

## 11. Workforce practices

- **Passwords:** Cognito-managed. Minimum length and complexity per AWS defaults; we can tighten as we go.
- **MFA:** required for all developer AWS IAM users and for the AWS root account. Required for therapist accounts in prod (Cognito MFA — `TBD` to enforce; default for v1 is "encouraged, not required").
- **Developer devices:** disk encryption required (FileVault / BitLocker). No prod DB access from personal devices without a signed BAA between Attuna and that device's owner (i.e., we control the device).
- **Code review:** every PR touching PHI tables, RLS policies, encryption code, audit log code, or anything in `services/api`, `services/brief-generator`, `packages/db/src` requires a second pair of eyes before merge. CLAUDE.md is the spec for what Claude must do; humans must apply the same standard.
- **Onboarding/offboarding:** when a developer joins, they get scoped IAM roles. When they leave, all roles are revoked the same day, sessions invalidated, and CMK access removed.

---

## 12. Mobile client app

This section governs `apps/mobile/`. The mobile app is a PHI surface — a phone in someone's pocket reading their own journal entries. The rules below are stricter than the web's where appropriate (a phone is more easily lost than a laptop).

### What ships in the binary

- **Cognito client pool** identity (M2.3b.3). Sign-in via SRP through `amazon-cognito-identity-js` — passwords never reach our servers.
- **API client** that hits the same `apps/web` endpoints any other client would, with the Cognito ID token in `Authorization: Bearer <jwt>`. No direct DB access from the device.
- **Envelope-decryption never runs on-device.** Entry bodies are decrypted server-side and sent over TLS. The mobile app holds plaintext entry bodies in memory only for the lifetime of a screen.

### Device storage

- **`expo-secure-store`** (Keychain on iOS, EncryptedSharedPreferences on Android) for: Cognito refresh tokens, the invite token between deep-link land + sign-up completion. Nothing else.
- **`AsyncStorage` (unencrypted)** is allowed only for non-PHI UI state: last-used screen, theme override, "have you seen the welcome tour" flag.
- **No PHI in `AsyncStorage`**, no PHI in any unencrypted on-device cache, no PHI in Expo's filesystem APIs.
- **Plaintext entries** are kept in React state only. Navigating away from a screen drops them. We do not implement an "offline draft" feature in M2.3b.3 — that lands later with explicit Secure Store encryption + a forced-sync-on-network UX.

### Push notifications (`TBD` until wired)

- Notification **body must be PHI-free**. Generic copy only: "Your therapist sent you a new prompt", "A new brief is ready" (M3+, brief is server-side anyway).
- Notification **payload (the data dictionary)** carries a deep link (`attuna://...`), not content. The app fetches the actual content over authenticated TLS after the user opens it.
- Push tokens (`ExpoPushToken`) are PHI-adjacent — tying a token to a client identity is health info. Store in a dedicated table (`client_push_token` when it lands), RLS-protected, deletable on sign-out.
- Disable push when the user signs out or removes the app — silent push to invalidate is acceptable.

### Biometric / device-level unlock

- **Required pre-prod** but optional for the closed beta. Use `expo-local-authentication` to gate `/journal` once enrolled.
- If biometric fails / device doesn't have one, fall back to Cognito password re-prompt — never let the app unlock without proof of liveness.

### Lost device / remote sign-out

- Cognito refresh tokens revocable per-device (`enableTokenRevocation: true` already in the stack — M2.3b.1).
- Add a "Sign out everywhere" affordance in the mobile Settings screen by M5 (closed beta).
- A stolen device can read whatever's on screen; once locked + outside the OS, the only persisted PHI-adjacent item is the encrypted refresh token, which is rotated on remote sign-out.

### App update / forced update

- Expo OTA updates are fine for non-native JS changes. Mobile **must check for a critical-update flag** at launch and force-update before granting access to PHI screens. Useful for "we found a security bug, please pull this build."
- The critical-update flag lives in a config endpoint (`/api/config/mobile-min-version`) — not implemented yet, listed as a §12 prod-blocker.

### Logging & analytics on-device

- Same rule as web (§7): no PHI in `console.log`, no third-party analytics SDKs without a BAA. The mobile app's crash reporter must scrub before send (Expo's default sends stack traces + JS error messages — both must be checked manually before turning on the firehose to any provider).

### TLS

- Expo defaults to TLS 1.2+ via the system networking stack. Don't override.
- Don't accept self-signed certs in any non-development build; the App Transport Security plist for iOS keeps us honest.

---

## 13. Open items (need sign-off before going to prod)

These are tracked here so we don't ship to first paying customer without resolving them. Each blocks production launch but not local development.

- [ ] **AWS BAA downloaded + stored** (AWS Artifact). Owner: founder.
- [ ] **KMS CMK provisioned** in dev/staging/prod with the alias scheme above. Currently env var `KMS_KEY_ID_PHI` exists but isn't set.
- [ ] **RLS policies templated** — actual policy SQL to land with M2.1's `client` + `audit_log` migrations.
- [ ] **Audit log retention policy** wired in infrastructure (RDS doesn't auto-archive; we may need an S3 cold-tier export job at year 1).
- [ ] **Bedrock model BAA list** verified for the specific models we plan to call (we currently target `anthropic.claude-opus-4-5` per `.env.example`).
- [ ] **Cognito MFA enforcement policy** — required vs. encouraged.
- [ ] **`RUNBOOK.md`** with the breach-response detailed steps.
- [ ] **Mobile push payload review** — confirm Expo's notification primitives don't include client content.
- [ ] **Sentry decision** — wire it (with scrubbing + BAA) or stay on CloudWatch-only for v1.
- [ ] **Postmark / SES decision** — `.env.example` currently lists `POSTMARK_TOKEN`; ARCHITECTURE.md says SES. Pick one. SES is the cheaper, AWS-native, already-BAA-covered choice; the only reason to add Postmark is deliverability, which is a "we'll see" problem.

---

## Quick reference for code reviewers

When reviewing a PR, ask:

1. Does this PR introduce a new column that holds PHI? If yes — is it on the envelope-encryption list in §5?
2. Does this PR introduce a new outbound network call? If yes — is the destination on the BAA inventory in §4?
3. Does this PR log anything? If yes — is everything logged free of PHI per §7?
4. Does this PR read or write a PHI row? If yes — is there a corresponding `audit_log` insert in the same transaction per §6?
5. Does this PR touch RLS, encryption keys, or audit log code? If yes — has a second engineer reviewed?

If you can answer "yes" or "n/a" to all five, it's safe to merge. If any answer is "I don't know," stop and ask.
