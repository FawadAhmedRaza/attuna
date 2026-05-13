import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Eyebrow } from "@attuna/ui/Eyebrow";

import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = { title: "Verify email" };

const emailSchema = z.string().email();

type VerifyPageProps = { searchParams: { email?: string } };

export default function VerifyPage({ searchParams }: VerifyPageProps) {
  const parsed = emailSchema.safeParse(searchParams.email);
  if (!parsed.success) redirect("/signup");

  // Mask email for display: "ma***@practice.com"
  const email = parsed.data;
  const [local, domain] = email.split("@");
  const masked =
    local && local.length > 2
      ? `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`
      : email;

  return (
    <div className="bg-surface border-border rounded-[20px] border p-8 md:p-10">
      <div className="mb-6">
        <Eyebrow flanked={false}>Check your email</Eyebrow>
        <h1
          className="display text-ink mt-3 text-[32px] font-medium md:text-[36px]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Enter your code.
        </h1>
        <p className="text-ink-soft tracking-body mt-2 text-[14px]" style={{ lineHeight: 1.55 }}>
          We sent a 6-digit code to <span className="text-ink font-semibold">{masked}</span>. It
          expires in ten minutes.
        </p>
      </div>

      <VerifyForm email={email} />
    </div>
  );
}
