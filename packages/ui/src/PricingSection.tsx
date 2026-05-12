"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Eyebrow } from "./Eyebrow";
import { PillButton } from "./PillButton";
import { Reveal } from "./Reveal";

type Billing = "monthly" | "yearly";

const TIERS: ReadonlyArray<{
  name: string;
  price: Record<Billing, number>;
  tag: string;
  features: ReadonlyArray<string>;
  featured?: boolean;
}> = [
  {
    name: "Solo",
    price: { monthly: 49, yearly: 39 },
    tag: "For private practice",
    features: ["Up to 10 clients", "Session prep briefs", "HIPAA-compliant infrastructure"],
  },
  {
    name: "Practice",
    price: { monthly: 149, yearly: 119 },
    tag: "For growing practices",
    features: ["Unlimited clients", "All 7 insight areas", "PDF reports", "Priority support"],
    featured: true,
  },
  {
    name: "Clinic",
    price: { monthly: 399, yearly: 329 },
    tag: "For multi-clinician practices",
    features: ["Up to 10 therapists", "Cross-clinician analytics", "Admin dashboard"],
  },
];

export function PricingSection() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <Reveal>
      <section id="pricing" className="px-5 py-16 md:px-10 md:py-[100px]">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-12 text-center">
            <div className="mb-4">
              <Eyebrow>Pricing</Eyebrow>
            </div>
            <h2
              className="display m-0 mb-6 font-medium"
              style={{
                fontSize: "clamp(32px, 4.5vw, 48px)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              Simple, fair, never per-client.
            </h2>
            <div className="bg-surface border-border inline-flex rounded-full border p-1">
              {(["monthly", "yearly"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  className={[
                    "rounded-full px-[22px] py-2 font-sans text-[13px] font-semibold capitalize transition-colors",
                    billing === b ? "bg-accent text-ink-on-accent" : "text-ink-soft bg-transparent",
                  ].join(" ")}
                >
                  {b}
                  {b === "yearly" && <span className="ml-1.5 text-[10px] opacity-80">−20%</span>}
                </button>
              ))}
            </div>
          </div>

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}
          >
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={[
                  "card-warm bg-surface relative rounded-[20px] px-8 py-9",
                  tier.featured ? "border-accent border-2" : "border-border border",
                ].join(" ")}
              >
                {tier.featured && (
                  <div className="bg-warm text-ink-on-accent tracking-body absolute -top-3 left-6 rounded-full px-3.5 py-1 text-[11px] font-semibold">
                    ✦ Most chosen
                  </div>
                )}
                <h3
                  className="display text-ink m-0 mb-1.5 text-[26px] font-medium"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {tier.name}
                </h3>
                <p className="text-ink-mute m-0 mb-6 text-[13px] font-medium">{tier.tag}</p>
                <div className="mb-6 flex items-baseline gap-1.5">
                  <span
                    className="display text-ink text-[48px] font-medium leading-none"
                    style={{ letterSpacing: "-0.025em" }}
                  >
                    ${tier.price[billing]}
                  </span>
                  <span className="text-ink-mute text-[13px] font-medium">/mo</span>
                </div>
                <a href="/signup" className="mb-6 block">
                  <div className="w-full">
                    <PillButton
                      variant={tier.featured ? "primary" : "outline"}
                      size="md"
                      style={{ width: "100%" }}
                    >
                      Begin trial
                    </PillButton>
                  </div>
                </a>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="text-ink-soft tracking-body flex gap-2.5 text-[13px]"
                      style={{ lineHeight: 1.5 }}
                    >
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-sage mt-0.5 flex-shrink-0"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

export default PricingSection;
