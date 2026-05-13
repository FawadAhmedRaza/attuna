import type { Metadata } from "next";

import { CLIENTS } from "../clients/_mock";

import { PageHeader } from "../_components/PageHeader";

import { AssistantView } from "./AssistantView";

export const metadata: Metadata = { title: "AI assistant" };

type Props = {
  searchParams: { client?: string };
};

export default function AssistantPage({ searchParams }: Props) {
  // The picker on this page is the source of truth for the conversation
  // scope. We round-trip through the URL so the back button, bookmarking, and
  // deep-linking from a client detail page all work without extra state.
  const requestedClientId = typeof searchParams.client === "string" ? searchParams.client : null;
  const clientId = requestedClientId && CLIENTS[requestedClientId] ? requestedClientId : null;

  return (
    // Flex column that fills the portal main area so AssistantView can pin its
    // composer to the bottom regardless of how much content sits above it.
    // The 9rem subtraction matches main's vertical padding + PageHeader height
    // — close enough that the bottom dock lands flush with the viewport edge.
    <div
      className="mx-auto flex w-full max-w-[860px] flex-col"
      style={{ minHeight: "calc(100dvh - 9rem)" }}
    >
      <PageHeader
        eyebrow="Therapist tool"
        title="AI assistant"
        subtitle="Think out loud about your practice. Observational, never diagnostic. Your clinical judgment leads."
      />
      <AssistantView clientId={clientId} />
    </div>
  );
}
