"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Lock, Save } from "lucide-react";

import { Eyebrow } from "@attuna/ui/Eyebrow";
import { PillButton } from "@attuna/ui/PillButton";

import { writeJournalEntryAction, type JournalWriteResult } from "./_actions";

type Entry = {
  id: string;
  body: string;
  wordCount: number;
  writtenAtIso: string;
};

type Props = {
  workspaceName: string;
  displayName: string;
  entries: Entry[];
};

export function JournalView({ workspaceName, displayName, entries }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header className="text-center">
        <Eyebrow flanked={false}>Your journal</Eyebrow>
        <h1
          className="display text-ink mt-3 text-[32px] font-medium md:text-[36px]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
        >
          {greeting(displayName)}
        </h1>
        <p
          className="text-ink-soft tracking-body mx-auto mt-3 max-w-[420px] text-[14px]"
          style={{ lineHeight: 1.6 }}
        >
          Only {workspaceName} can read what you write here. No AI talks to you, no streaks, no
          audience.
        </p>
      </header>

      <NewEntryForm />

      <EntriesList entries={entries} />

      <p
        className="text-ink-faint text-center text-[12px] italic"
        style={{ letterSpacing: "-0.005em" }}
      >
        <Lock size={11} strokeWidth={1.75} className="text-ink-faint mb-0.5 mr-1 inline" />
        Entries are encrypted before they leave your device — only your therapist can read them.
      </p>
    </div>
  );
}

function greeting(displayName: string): string {
  if (displayName === "you") return "Welcome.";
  // Pull a friendly form — use whatever the therapist set as
  // display_name. Could be "Maya R." or initials; either way it's
  // human-readable.
  return `Hi, ${displayName}.`;
}

// ── New entry form ─────────────────────────────────────────────────

function NewEntryForm() {
  const [state, action] = useFormState<JournalWriteResult | null, FormData>(
    writeJournalEntryAction,
    null,
  );
  const ref = useRef<HTMLTextAreaElement>(null);

  // Clear the textarea after a successful write so the inviter can
  // continue with a blank canvas. The page revalidates so the list
  // below re-renders with the new entry.
  useEffect(() => {
    if (state?.ok) {
      if (ref.current) ref.current.value = "";
    }
  }, [state]);

  return (
    <section className="bg-surface border-border rounded-[20px] border p-6 md:p-7">
      <form action={action} className="flex flex-col gap-4">
        <label
          htmlFor="entry-body"
          className="text-ink-mute text-[11px] font-semibold uppercase tracking-[0.04em]"
        >
          What&apos;s on your mind?
        </label>
        <textarea
          ref={ref}
          id="entry-body"
          name="body"
          required
          rows={6}
          autoComplete="off"
          placeholder="Today went…"
          className="bg-bg-soft text-ink tracking-body border-border focus:border-accent w-full resize-y rounded-[14px] border px-4 py-3 font-sans text-[15px] leading-relaxed transition-[border-color,background] duration-200"
          style={{ minHeight: 140 }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-ink-faint text-[11px] font-medium">
            No length minimum — three sentences is plenty.
          </span>
          <Submit />
        </div>
        {state?.ok === false ? (
          <p className="text-rose text-[13px] font-medium" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p className="text-sage text-[13px] font-medium" role="status">
            Saved — {state.wordCount} {state.wordCount === 1 ? "word" : "words"}.
          </p>
        ) : null}
      </form>
    </section>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <PillButton type="submit" variant="primary" size="md" disabled={pending} aria-busy={pending}>
      <Save size={14} strokeWidth={1.75} />
      {pending ? "Saving…" : "Save entry"}
    </PillButton>
  );
}

// ── Entries list ──────────────────────────────────────────────────

function EntriesList({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <section className="bg-surface border-border rounded-[20px] border p-6 text-center md:p-8">
        <p className="text-ink-soft text-[14px]">
          No entries yet. Write your first one above whenever you&apos;re ready.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2 px-1">
        <h2
          className="display text-ink m-0 text-[18px] font-medium"
          style={{ letterSpacing: "-0.015em" }}
        >
          Your entries
        </h2>
        <span className="text-ink-mute text-[13px] font-medium">{entries.length}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {entries.map((e) => (
          <li key={e.id} className="bg-surface border-border rounded-[16px] border p-5">
            <div className="text-ink-mute mb-2 flex items-center gap-2 text-[11px] font-medium">
              <span>{prettyDate(e.writtenAtIso)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {e.wordCount} {e.wordCount === 1 ? "word" : "words"}
              </span>
            </div>
            <p
              className="text-ink m-0 whitespace-pre-wrap text-[15px]"
              style={{ lineHeight: 1.65, letterSpacing: "-0.003em" }}
            >
              {e.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function prettyDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
