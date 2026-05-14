import type { Metadata } from "next";
import { Check } from "lucide-react";

import { PillButton } from "@attuna/ui/PillButton";

import { PageHeader } from "../_components/PageHeader";

export const metadata: Metadata = { title: "Integrations" };

type Integration = {
  id: string;
  name: string;
  description: string;
  connected: boolean;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "simplepractice",
    name: "SimplePractice",
    description: "Sync clients and session notes",
    connected: true,
  },
  {
    id: "google_cal",
    name: "Google Calendar",
    description: "Auto-create session prep reminders",
    connected: true,
  },
  { id: "jane", name: "Jane App", description: "Practice management sync", connected: false },
  { id: "stripe", name: "Stripe", description: "Billing and invoicing", connected: true },
  {
    id: "zoom",
    name: "Zoom",
    description: "Telehealth recording analysis (opt-in)",
    connected: false,
  },
  { id: "therapy_notes", name: "TherapyNotes", description: "EHR integration", connected: false },
];

export default function IntegrationsPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Admin"
        title="Integrations"
        subtitle="Connect Attuna to your existing tools."
      />

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {INTEGRATIONS.map((it) => (
          <div key={it.id} className="bg-surface border-border rounded-2xl border p-6 md:p-7">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3
                className="display text-ink m-0 text-[18px] font-medium md:text-[19px]"
                style={{ letterSpacing: "-0.015em" }}
              >
                {it.name}
              </h3>
              {it.connected ? (
                <span className="text-sage inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[var(--sage-bg,rgba(92,139,111,0.12))] px-2.5 py-1 text-[11px] font-semibold">
                  <Check size={11} strokeWidth={2.5} />
                  Connected
                </span>
              ) : (
                <PillButton variant="outline" size="sm">
                  Connect
                </PillButton>
              )}
            </div>
            <p
              className="text-ink-mute m-0 text-[13px] font-medium"
              style={{ letterSpacing: "-0.005em" }}
            >
              {it.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
