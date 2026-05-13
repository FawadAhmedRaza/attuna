import type { Metadata } from "next";

import { PageHeader } from "../_components/PageHeader";

import { AuthorPillButton } from "./AuthorPillButton";
import { EditSuggestionLink } from "./EditSuggestionLink";
import { SuggestionModal } from "./SuggestionModal";
import { SUGGESTIONS } from "./_mock";

export const metadata: Metadata = { title: "Suggestions" };

export default function SuggestionsPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Authored prompts"
        title="Suggestions"
        subtitle="Calm prompts your clients see in their journaling app"
        action={<AuthorPillButton />}
      />

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}
      >
        {SUGGESTIONS.map((s) => (
          <article
            key={s.id}
            className="card-warm bg-surface border-border flex flex-col rounded-2xl border px-7 py-6"
          >
            <h3
              className="display text-ink m-0 mb-3 text-[18px] font-medium"
              style={{ letterSpacing: "-0.015em" }}
            >
              {s.title}
            </h3>
            <p
              className="display-text text-ink-soft m-0 mb-4 flex-1 text-[14px] font-normal italic"
              style={{ lineHeight: 1.6 }}
            >
              &ldquo;{s.body}&rdquo;
            </p>
            <div className="border-border-soft flex items-center justify-between border-t pt-3.5">
              <span className="text-ink-mute text-[11px] font-semibold">Sent {s.uses} times</span>
              <EditSuggestionLink id={s.id} />
            </div>
          </article>
        ))}
      </div>

      <SuggestionModal suggestions={SUGGESTIONS} />
    </div>
  );
}
