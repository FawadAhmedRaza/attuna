"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Mail, UserPlus } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";

import { createClientAction, type ClientActionResult } from "./_actions";

export function NewClientForm({ slug }: { slug: string }) {
  const [state, action] = useFormState<ClientActionResult | null, FormData>(
    createClientAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form after a successful submit so the inviter can add another
  // client without re-typing the previous one.
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <section className="bg-surface border-border rounded-2xl border p-6">
      <h2
        className="display text-ink mb-1 text-[18px] font-medium"
        style={{ letterSpacing: "-0.015em" }}
      >
        Add a client
      </h2>
      <p className="text-ink-soft mb-5 text-[13px]">
        Use a display name only — first name, initials, or a code is fine. You can invite them to
        journal later.
      </p>

      <form
        ref={formRef}
        action={action}
        className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
      >
        <input type="hidden" name="slug" value={slug} />
        <Field htmlFor="client-name" label="Display name">
          <Input
            id="client-name"
            name="display_name"
            type="text"
            autoComplete="off"
            required
            placeholder="Maya R."
            invalid={state?.ok === false}
          />
        </Field>
        <Field htmlFor="client-email" label="Invite email" hint="Optional — used in M2.2">
          <Input
            id="client-email"
            name="invite_email"
            type="email"
            autoComplete="off"
            leftIcon={Mail}
            placeholder="optional"
            invalid={state?.ok === false}
          />
        </Field>
        <div className="flex items-end">
          <Submit />
        </div>
      </form>

      {state?.ok === false ? (
        <p className="text-rose mt-3 text-[13px] font-medium" role="alert">
          {state.error}
        </p>
      ) : null}

      {state?.ok && state.message ? (
        <p className="text-sage mt-3 text-[13px] font-medium" role="status">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <PillButton type="submit" variant="primary" size="md" disabled={pending} aria-busy={pending}>
      <UserPlus size={14} strokeWidth={1.75} />
      {pending ? "Adding…" : "Add client"}
    </PillButton>
  );
}
