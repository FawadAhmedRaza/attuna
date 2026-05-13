"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { PillButton } from "@attuna/ui/PillButton";

/**
 * Route-level error boundary for the portal. Without this, a runtime error
 * inside any portal page surfaces Next.js's bare "missing required error
 * components" message, which is confusing in dev and broken-looking in prod.
 *
 * Keep this calm — error states still belong to the brand.
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this would funnel to a PHI-scrubbed error reporter.
    // Today we just log to the dev console so the cause isn't invisible.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[portal:error]", error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[520px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="bg-bg-soft border-border-soft mb-5 flex h-12 w-12 items-center justify-center rounded-full border">
        <AlertCircle size={20} strokeWidth={1.75} className="text-warm" />
      </div>
      <h1
        className="display text-ink m-0 mb-3 text-[26px] font-medium"
        style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
      >
        Something didn&apos;t load right.
      </h1>
      <p
        className="text-ink-soft tracking-body mx-auto mb-6 max-w-[400px] text-[14px]"
        style={{ lineHeight: 1.6 }}
      >
        We hit an unexpected problem rendering this page. Your client data is safe and unchanged.
        Try again, or head back to Today.
      </p>
      {error.digest ? (
        <p className="text-ink-faint mb-6 font-mono text-[11px]">ref · {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <PillButton variant="primary" size="sm" onClick={reset}>
          Try again
        </PillButton>
        <Link href="/today">
          <PillButton variant="outline" size="sm">
            Back to Today
          </PillButton>
        </Link>
      </div>
    </div>
  );
}
