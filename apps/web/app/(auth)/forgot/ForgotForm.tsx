"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { OtpInput } from "@attuna/ui/OtpInput";
import { PillButton } from "@attuna/ui/PillButton";

import {
  forgotPasswordAction,
  resetPasswordAction,
  type ActionResult,
  type StepResult,
} from "@/lib/auth/actions";

function EmailSubmit() {
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
      {pending ? "Sending code…" : "Send reset code"}
    </PillButton>
  );
}

function ResetSubmit() {
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
      {pending ? "Saving…" : "Set new password"}
    </PillButton>
  );
}

export function ForgotForm() {
  const [emailState, emailAction] = useFormState<StepResult | null, FormData>(
    forgotPasswordAction,
    null,
  );
  const [resetState, resetAction] = useFormState<ActionResult | null, FormData>(
    resetPasswordAction,
    null,
  );
  const [email, setEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Promote to step 2 when the email step succeeds.
  useEffect(() => {
    if (emailState?.ok && emailState.step === "code") setEmail(emailState.email);
  }, [emailState]);

  if (email) {
    return (
      <form action={resetAction} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="email" value={email} />

        <Field label="6-digit code" htmlFor="code">
          <OtpInput name="code" length={6} autoFocus invalid={resetState?.ok === false} />
        </Field>

        <Field label="New password" htmlFor="password" hint="At least 8 characters.">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            leftIcon={Lock}
            placeholder="At least 8 characters"
            invalid={resetState?.ok === false}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-ink-mute hover:text-ink rounded-md p-1.5 transition-colors"
              >
                {showPassword ? (
                  <EyeOff size={16} strokeWidth={1.75} />
                ) : (
                  <Eye size={16} strokeWidth={1.75} />
                )}
              </button>
            }
          />
        </Field>

        {resetState?.ok === false ? (
          <p className="text-rose tracking-body text-[13px] font-medium" role="alert">
            {resetState.error}
          </p>
        ) : null}

        <ResetSubmit />

        <button
          type="button"
          onClick={() => setEmail(null)}
          className="text-ink-mute hover:text-ink-soft text-center text-[13px] transition-colors"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form action={emailAction} className="flex flex-col gap-5" noValidate>
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          leftIcon={Mail}
          placeholder="you@practice.com"
          invalid={emailState?.ok === false}
        />
      </Field>

      {emailState?.ok === false ? (
        <p className="text-rose tracking-body text-[13px] font-medium" role="alert">
          {emailState.error}
        </p>
      ) : null}

      <EmailSubmit />

      <p className="text-ink-mute mt-2 text-center text-[13px]">
        Remembered it?{" "}
        <Link href="/signin" className="text-accent font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default ForgotForm;
