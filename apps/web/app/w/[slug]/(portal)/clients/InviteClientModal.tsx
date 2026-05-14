"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Mail, X } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";

import type { ActionResult } from "@/lib/auth/actions";
import { inviteClientAction } from "./_actions";

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
      {pending ? "Sending invite…" : "Send invite"}
    </PillButton>
  );
}

export function InviteClientModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("invite") === "1";

  const [state, formAction] = useFormState<ActionResult | null, FormData>(inviteClientAction, null);
  const [sent, setSent] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset success state when the modal closes.
  useEffect(() => {
    if (!open) setSent(false);
  }, [open]);

  // Move "ok" submissions into our local "sent" state.
  useEffect(() => {
    if (state?.ok) setSent(true);
  }, [state]);

  // Focus the first field on open.
  useEffect(() => {
    if (open) firstInputRef.current?.focus();
  }, [open]);

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    const next = new URLSearchParams(searchParams);
    next.delete("invite");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "color-mix(in oklab, var(--ink) 35%, transparent)" }}
      />
      <div
        ref={dialogRef}
        className="bg-surface border-border relative w-full max-w-[440px] rounded-[20px] border p-7 shadow-2xl md:p-8"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="text-ink-mute hover:text-ink absolute right-4 top-4 rounded-full p-1.5 transition-colors"
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        {sent ? (
          <SentState onClose={close} />
        ) : (
          <>
            <h2
              id="invite-title"
              className="display text-ink m-0 mb-1.5 text-[24px] font-medium"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
            >
              Invite a client.
            </h2>
            <p
              className="text-ink-soft tracking-body mb-6 text-[14px]"
              style={{ lineHeight: 1.55 }}
            >
              We&apos;ll send a calm email with a link. Discuss Attuna with them in session first —
              consent matters.
            </p>

            <form action={formAction} className="flex flex-col gap-4" noValidate>
              <Field label="Client email" htmlFor="invite-email">
                <Input
                  id="invite-email"
                  ref={firstInputRef}
                  name="email"
                  type="email"
                  autoComplete="off"
                  required
                  leftIcon={Mail}
                  placeholder="firstclient@email.com"
                  invalid={state?.ok === false}
                />
              </Field>

              {state?.ok === false ? (
                <p className="text-rose tracking-body text-[13px] font-medium" role="alert">
                  {state.error}
                </p>
              ) : null}

              <SubmitButton />
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function SentState({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center">
      <div
        className="bg-accent-bg mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" }}
      >
        <Check size={24} strokeWidth={2} className="text-accent" />
      </div>
      <h2
        className="display text-ink m-0 mb-2 text-[22px] font-medium"
        style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
      >
        Invite sent.
      </h2>
      <p className="text-ink-soft tracking-body mb-6 text-[14px]" style={{ lineHeight: 1.55 }}>
        They&apos;ll see the invite next time they check their email.
      </p>
      <PillButton variant="primary" size="md" onClick={onClose}>
        Done
      </PillButton>
    </div>
  );
}

export default InviteClientModal;
