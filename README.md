# Attuna

A quiet assistant for therapists. Reads client journal entries between sessions and surfaces patterns — calmly, observationally, never diagnostically — so therapists arrive prepared.

---

## What this is

**Two products, one system:**

1. **Therapist portal (web)** — Where licensed therapists manage clients, read briefs, author suggestions, export PDFs. This is the B2B SaaS.
2. **Client journaling app (mobile)** — Where therapy clients write entries between sessions. Calm, no streaks, no AI feedback. Clients pay nothing; their therapist pays.

**The intelligence layer:** When a client journals enough, an AI pipeline reads their entries and produces a single "session brief" the therapist sees before their next session. The brief surfaces patterns across seven insight areas: emotional, cognitive, behavioral, avoidance, narrative, progress, therapist-guided.

**What this is NOT:**
- An AI therapist. Clients never talk to AI. The AI never talks to clients.
- A diagnostic tool. No DSM, no ICD, no labels. Patterns only.
- An EHR. We don't replace clinical record systems.
- A mood tracker. The journaling is open-text, not check-box.

---

## Who this is for

**Primary buyer:** Licensed therapists in private practice or small group practices. English-speaking, increasingly comfortable with software, wants to feel closer to clients without working evenings.

**Secondary buyer:** Clinic administrators managing 5–25 clinicians who want better between-session tools without violating client trust.

**Geographic priority:** US first (HIPAA), then UK/EU (GDPR), then Pakistan/MENA (founder market).

---

## Success criteria for the MVP

The MVP succeeds when:

1. A therapist can sign up, complete onboarding, and invite a client in under 10 minutes.
2. A client can install the app, accept invite, and write their first entry in under 5 minutes.
3. After 5+ entries from one client, the therapist sees a generated brief that they describe as "useful" or "surprisingly accurate" in qualitative interviews.
4. Therapists complete at least 3 briefs/week and don't churn within 30 days.
5. No PHI leaks, no HIPAA violations, no model-training on client data.

---

## What's in this repo (when built)

```
attuna/
├── apps/
│   ├── web/              # Next.js therapist portal
│   ├── mobile/           # Expo client journaling app
│   └── admin/            # Internal tools (license review, audit, etc.)
├── packages/
│   ├── ui/               # Shared design system (web)
│   ├── api-client/       # Type-safe API client
│   └── shared/           # Shared types, validators, constants
├── services/
│   ├── api/              # Main API (Hono on Lambda or Fargate)
│   ├── brief-generator/  # Worker that calls Bedrock
│   └── notifier/         # Email + push notifications
├── infra/                # AWS CDK or Terraform
└── docs/                 # All context files (this folder)
```

---

## Critical constraints

These shape every decision.

**HIPAA compliance is non-negotiable.** See `HIPAA.md`. Every architectural choice must consider PHI handling.

**The brand is calm.** See `DESIGN_SYSTEM.md`. We never reach for cold-tech aesthetics, never use spammy growth patterns (streaks, gamification, FOMO), never let AI feel "smart" at the expense of humility.

**The therapist's clinical judgment leads.** AI outputs are observational, not directive. Confidence is calibrated. Diagnostic terms are forbidden in outputs.

**Cost discipline.** This is a bootstrap-friendly product. Aim for under $400/month AWS spend at 50 active therapists. Bedrock token usage is the biggest variable — design pipelines to be triggered on real change, not on every entry.

---

## What to read next

If you're Claude Code starting work on this, read in this order:

1. `CLAUDE.md` — how to work on this project
2. `ROADMAP.md` — what to build first
3. `ARCHITECTURE.md` — tech stack and structure
4. `DESIGN_SYSTEM.md` — visual language
5. `HIPAA.md` — compliance constraints
6. `PROMPTS.md` — AI prompt + eval criteria
7. `attuna_app.jsx` — the prototype, reference only — DO NOT copy directly into production

---

## Glossary

- **Brief** — The AI-generated summary a therapist reads before a session. One per client per period.
- **Entry** — A single journal entry written by a client.
- **Insight area** — One of seven analysis categories (emotional, cognitive, behavioral, avoidance, narrative, progress, therapist-guided).
- **Suggestion** — A therapist-authored prompt clients see in their journaling app.
- **Template** — A pre-built journaling structure (e.g., "Anxiety check-in") therapists can apply to a client.
- **PHI** — Protected Health Information. Under HIPAA, anything that could identify a patient combined with health info. Journal entries are PHI.
