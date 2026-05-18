"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";
import { Textarea } from "@attuna/ui/Textarea";

import type { ActionResult } from "@/lib/auth/actions";
import { createSuggestionAction, updateSuggestionAction } from "./_actions";
import type { Suggestion } from "./_mock";

type Mode = "new" | "edit" | "closed";

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  const idle = mode === "edit" ? "Save changes" : "Save suggestion";
  const busy = mode === "edit" ? "Saving…" : "Saving…";
  return (
    <PillButton
      type="submit"
      variant="primary"
      size="md"
      disabled={pending}
      style={{ width: "100%" }}
      aria-busy={pending || undefined}
    >
      {pending ? busy : idle}
    </PillButton>
  );
}

export function SuggestionModal({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get("edit");
  const isNew = searchParams.get("new") === "1";
  const mode: Mode = isNew ? "new" : editId ? "edit" : "closed";
  const open = mode !== "closed";

  const editing = useMemo(
    () => (editId ? (suggestions.find((s) => s.id === editId) ?? null) : null),
    [editId, suggestions],
  );

  // Both create and update share ActionResult, so we drive a single form
  // with a runtime-selected action.
  const [createState, createAction] = useFormState<ActionResult | null, FormData>(
    createSuggestionAction,
    null,
  );
  const [updateState, updateAction] = useFormState<ActionResult | null, FormData>(
    updateSuggestionAction,
    null,
  );
  const formAction = mode === "edit" ? updateAction : createAction;
  const state = mode === "edit" ? updateState : createState;

  const [saved, setSaved] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setSaved(false);
  }, [open]);

  useEffect(() => {
    if (state?.ok) setSaved(true);
  }, [state]);

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    next.delete("edit");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  if (!open) return null;

  const heading = mode === "edit" ? "Edit suggestion." : "Author a suggestion.";
  const subhead =
    mode === "edit"
      ? "Update the wording. Saved suggestions are visible to your clients in their app."
      : "Calm, open prompts work best. Clients see this in their journaling app — they can respond or skip.";

  // Edit mode but unknown id (deleted, bookmark stale) — treat as a soft 404
  // and just show the create flow.
  const isOrphanEdit = mode === "edit" && editing === null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestion-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "color-mix(in oklab, var(--ink) 35%, transparent)" }}
      />
      <div className="bg-surface border-border relative w-full max-w-[480px] rounded-[20px] border p-7 shadow-2xl md:p-8">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="text-ink-mute hover:text-ink absolute right-4 top-4 rounded-full p-1.5 transition-colors"
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        {saved ? (
          <SavedState
            label={mode === "edit" ? "Updated." : "Saved."}
            body={
              mode === "edit"
                ? "Clients will see the updated wording on their next visit."
                : "Your clients will see this prompt in their journaling app."
            }
            onClose={close}
          />
        ) : (
          <>
            <h2
              id="suggestion-title"
              className="display text-ink m-0 mb-1.5 text-[24px] font-medium"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
            >
              {heading}
            </h2>
            <p
              className="text-ink-soft tracking-body mb-6 text-[14px]"
              style={{ lineHeight: 1.55 }}
            >
              {subhead}
            </p>

            {isOrphanEdit ? (
              <p className="text-warm tracking-body mb-4 text-[13px] font-medium" role="alert">
                That suggestion is no longer available — saving here will create a new one.
              </p>
            ) : null}

            <form
              action={formAction}
              className="flex flex-col gap-4"
              noValidate
              key={editing?.id ?? "new"}
            >
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

              <Field label="Title" htmlFor="suggestion-title-input">
                <Input
                  id="suggestion-title-input"
                  ref={titleRef}
                  name="title"
                  type="text"
                  required
                  maxLength={80}
                  defaultValue={editing?.title ?? ""}
                  placeholder="When the day felt heavy"
                  invalid={state?.ok === false}
                />
              </Field>

              <Field
                label="Body"
                htmlFor="suggestion-body-input"
                hint="Short, open, never directive."
              >
                <Textarea
                  id="suggestion-body-input"
                  name="body"
                  rows={4}
                  required
                  maxLength={400}
                  defaultValue={editing?.body ?? ""}
                  placeholder="What was hardest to set down today? You don&rsquo;t need to solve it &mdash; just describe what was there."
                  invalid={state?.ok === false}
                />
              </Field>

              {state?.ok === false ? (
                <p className="text-rose tracking-body text-[13px] font-medium" role="alert">
                  {state.error}
                </p>
              ) : null}

              <SubmitButton mode={mode} />
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function SavedState({
  label,
  body,
  onClose,
}: {
  label: string;
  body: string;
  onClose: () => void;
}) {
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
        {label}
      </h2>
      <p className="text-ink-soft tracking-body mb-6 text-[14px]" style={{ lineHeight: 1.55 }}>
        {body}
      </p>
      <PillButton variant="primary" size="md" onClick={onClose}>
        Done
      </PillButton>
    </div>
  );
}

export default SuggestionModal;
