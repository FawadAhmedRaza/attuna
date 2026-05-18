import type { Metadata } from "next";
import { Download, Filter } from "lucide-react";

import { PillButton } from "@attuna/ui/PillButton";

import { PageHeader } from "../_components/PageHeader";

export const metadata: Metadata = { title: "Audit log" };

type Action =
  | "viewed_brief"
  | "brief_generated"
  | "analysis_run"
  | "journal_entry_created"
  | "suggestion_sent";

type Entry = {
  id: string;
  timestamp: string;
  actor: string;
  action: Action;
  target: string;
  details?: string;
};

const ENTRIES: Entry[] = [
  {
    id: "a_001",
    timestamp: "May 5, 9:14 AM",
    actor: "Dr. Sara Ahmed",
    action: "viewed_brief",
    target: "c_0042",
  },
  {
    id: "a_002",
    timestamp: "May 5, 8:45 AM",
    actor: "system",
    action: "brief_generated",
    target: "c_0042",
    details: "prompt_v1.4",
  },
  {
    id: "a_003",
    timestamp: "May 4, 10:30 PM",
    actor: "system",
    action: "analysis_run",
    target: "c_0042",
    details: "7 insight areas",
  },
  {
    id: "a_004",
    timestamp: "May 4, 9:12 PM",
    actor: "Maya R.",
    action: "journal_entry_created",
    target: "e_0094",
  },
  {
    id: "a_005",
    timestamp: "May 4, 6:30 PM",
    actor: "Dr. Sara Ahmed",
    action: "suggestion_sent",
    target: "c_0042",
  },
];

export default function AuditPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        subtitle="Every PHI access event — required for HIPAA."
        action={
          <>
            <PillButton variant="outline" size="sm">
              <Filter size={14} strokeWidth={1.75} className="mr-1.5" />
              Filter
            </PillButton>
            <PillButton variant="outline" size="sm">
              <Download size={14} strokeWidth={1.75} className="mr-1.5" />
              Export
            </PillButton>
          </>
        }
      />

      <div className="bg-surface border-border overflow-hidden rounded-2xl border">
        {ENTRIES.map((e, i) => (
          <div
            key={e.id}
            className={[
              "grid items-center gap-4 px-5 py-4 md:grid-cols-[180px_1fr_auto_1fr] md:px-6",
              i > 0 ? "border-border-soft border-t" : "",
            ].join(" ")}
          >
            <div className="text-ink-mute font-mono text-[12px]">{e.timestamp}</div>
            <div
              className="text-ink text-[13px] font-semibold"
              style={{ letterSpacing: "-0.005em" }}
            >
              {e.actor}
            </div>
            <ActionPill action={e.action} />
            <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
              <span className="text-ink-mute font-mono text-[12px]">{e.target}</span>
              {e.details ? (
                <span className="text-ink-faint font-mono text-[11px]">{e.details}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionPill({ action }: { action: Action }) {
  const isView = action.includes("viewed");
  const isGenerated = action.includes("generated");
  const styles = isView
    ? "bg-surface-deep text-ink-soft border-transparent"
    : isGenerated
      ? "bg-accent-bg text-accent border-transparent"
      : "bg-transparent text-ink-soft border-border";
  return (
    <span
      className={[
        "tracking-body inline-flex w-fit items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold",
        styles,
      ].join(" ")}
    >
      {action}
    </span>
  );
}
