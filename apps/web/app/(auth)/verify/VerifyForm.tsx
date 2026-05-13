"use client";

import { useFormState, useFormStatus } from "react-dom";

import { OtpInput } from "@attuna/ui/OtpInput";
import { PillButton } from "@attuna/ui/PillButton";

import { resendOtpAction, verifyOtpAction, type ActionResult } from "@/lib/auth/actions";

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <PillButton
      type="submit"
      variant="primary"
      size="md"
      disabled={pending}
      style={{ width: "100%" }}
      aria-busy={pending || undefined}
    >
      {pending ? "Verifying…" : "Verify"}
    </PillButton>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-accent text-[13px] font-semibold hover:underline disabled:opacity-50"
    >
      {pending ? "Sending…" : "Resend code"}
    </button>
  );
}

export function VerifyForm({ email }: { email: string }) {
  const [verifyState, verifyFormAction] = useFormState<ActionResult | null, FormData>(
    verifyOtpAction,
    null,
  );
  const [resendState, resendFormAction] = useFormState<ActionResult | null, FormData>(
    resendOtpAction,
    null,
  );

  return (
    <div className="flex flex-col gap-5">
      <form action={verifyFormAction} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="email" value={email} />

        <OtpInput name="code" length={6} autoFocus invalid={verifyState?.ok === false} />

        {verifyState?.ok === false ? (
          <p className="text-rose tracking-body text-[13px] font-medium" role="alert">
            {verifyState.error}
          </p>
        ) : null}

        <VerifyButton />
      </form>

      <form action={resendFormAction} className="flex items-center justify-between">
        <input type="hidden" name="email" value={email} />
        <span className="text-ink-mute text-[13px]">Didn&apos;t receive the code?</span>
        {resendState?.ok ? (
          <span className="text-sage text-[13px] font-semibold">Sent — check your inbox</span>
        ) : (
          <ResendButton />
        )}
      </form>
    </div>
  );
}

export default VerifyForm;
