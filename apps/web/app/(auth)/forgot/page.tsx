import type { Metadata } from "next";

import { Eyebrow } from "@attuna/ui/Eyebrow";

import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <div className="bg-surface border-border rounded-[20px] border p-8 md:p-10">
      <div className="mb-6">
        <Eyebrow flanked={false}>Reset password</Eyebrow>
        <h1
          className="display text-ink mt-3 text-[32px] font-medium md:text-[36px]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Send yourself a code.
        </h1>
        <p className="text-ink-soft tracking-body mt-2 text-[14px]" style={{ lineHeight: 1.55 }}>
          Enter the email you signed up with. We&apos;ll send a 6-digit code to set a new password.
        </p>
      </div>

      <ForgotForm />
    </div>
  );
}
