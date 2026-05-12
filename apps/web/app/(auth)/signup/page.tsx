import type { Metadata } from "next";

import { Eyebrow } from "@attuna/ui/Eyebrow";

import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = { title: "Begin trial" };

export default function SignUpPage() {
  return (
    <div className="bg-surface border-border rounded-[20px] border p-8 md:p-10">
      <div className="mb-6">
        <Eyebrow flanked={false}>Thirty-day trial</Eyebrow>
        <h1
          className="display text-ink mt-3 text-[32px] font-medium md:text-[36px]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Begin your trial.
        </h1>
        <p className="text-ink-soft tracking-body mt-2 text-[14px]" style={{ lineHeight: 1.55 }}>
          No card needed. We&apos;ll email a 6-digit code to confirm your address.
        </p>
      </div>

      <SignUpForm />
    </div>
  );
}
