/**
 * Pricing tiers. Used by both the marketing PricingSection and the
 * onboarding plan picker. The `id` matches the `practice_type` enum in
 * `@attuna/db/schema/workspace-survey` — when onboarding submits, this id
 * goes straight into `workspace_survey.practice_type` and is mapped to
 * `workspace.plan` in the action.
 *
 * Edit prices and features here.
 */
export type Billing = "monthly" | "yearly";
export type PricingCta = "trial" | "sales";

export type PricingTier = {
  /** Matches workspace_survey.practice_type. */
  id: "solo" | "group" | "clinic" | "training";
  name: string;
  price: Record<Billing, number>;
  tag: string;
  features: ReadonlyArray<string>;
  cta: PricingCta;
  featured?: boolean;
};

export const SALES_EMAIL = "hello@attuna.io";

export const PRICING_TIERS: ReadonlyArray<PricingTier> = [
  {
    id: "solo",
    name: "Solo",
    price: { monthly: 49, yearly: 39 },
    tag: "For private practice",
    features: ["Up to 10 clients", "Session prep briefs", "HIPAA-compliant infrastructure"],
    cta: "trial",
  },
  {
    id: "group",
    name: "Practice",
    price: { monthly: 149, yearly: 119 },
    tag: "For growing practices",
    features: ["Unlimited clients", "All 7 insight areas", "PDF reports", "Priority support"],
    cta: "trial",
    featured: true,
  },
  {
    id: "clinic",
    name: "Clinic",
    price: { monthly: 399, yearly: 329 },
    tag: "For multi-clinician practices",
    features: ["Up to 10 therapists", "Cross-clinician analytics", "Admin dashboard"],
    cta: "sales",
  },
  {
    id: "training",
    name: "Training",
    price: { monthly: 79, yearly: 63 },
    tag: "For training programs",
    features: ["Supervised trainees", "Supervisor sign-off", "Cohort analytics"],
    cta: "sales",
  },
];
