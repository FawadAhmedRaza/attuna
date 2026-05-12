import type { Metadata } from "next";

import { Eyebrow } from "@attuna/ui/Eyebrow";

import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

type SignInPageProps = {
  searchParams: { next?: string; reset?: string };
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  const next =
    typeof searchParams.next === "string" && searchParams.next.startsWith("/")
      ? searchParams.next
      : undefined;
  const justReset = searchParams.reset === "1";

  return (
    <div className="bg-surface border-border rounded-[20px] border p-8 md:p-10">
      <div className="mb-6">
        <Eyebrow flanked={false}>Welcome back</Eyebrow>
        <h1
          className="display text-ink mt-3 text-[32px] font-medium md:text-[36px]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          Sign in to your portal.
        </h1>
        <p className="text-ink-soft tracking-body mt-2 text-[14px]" style={{ lineHeight: 1.55 }}>
          Calm session prep, waiting where you left it.
        </p>
      </div>

      {justReset ? (
        <div
          role="status"
          aria-live="polite"
          className="bg-accent-bg text-accent border-accent/20 mb-5 rounded-[12px] border px-4 py-3 text-[13px] font-medium"
        >
          Password updated. Sign in with your new password.
        </div>
      ) : null}

      <SignInForm next={next} />
    </div>
  );
}
