"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";

import { signUpAction, type ActionResult } from "@/lib/auth/actions";

function SubmitButton() {
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
      {pending ? "Sending code…" : "Begin trial"}
    </PillButton>
  );
}

export function SignUpForm() {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(signUpAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Field label="Your name" htmlFor="name">
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          leftIcon={User}
          placeholder="Sara Marchetti"
          invalid={state?.ok === false}
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          leftIcon={Mail}
          placeholder="you@practice.com"
          invalid={state?.ok === false}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="At least 8 characters. We'll ask for mixed case, a number, and a symbol later."
      >
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          leftIcon={Lock}
          placeholder="At least 8 characters"
          invalid={state?.ok === false}
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

      {state?.ok === false ? (
        <p className="text-rose tracking-body text-[13px] font-medium" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-ink-mute mt-2 text-center text-[13px]">
        Already have an account?{" "}
        <Link href="/signin" className="text-accent font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default SignUpForm;
