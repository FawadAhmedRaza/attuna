import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

import { DateGreeting } from "./DateGreeting";

export const metadata: Metadata = { title: "Today" };

// Phase 2: synthetic data. Phase 4 wires this to /api/clients + briefs.
const READY_BRIEFS = [
  {
    id: "maya",
    name: "Maya R.",
    initial: "M",
    entries: 14,
    days: 19,
    lastSession: "8 days ago",
  },
  {
    id: "devon",
    name: "Devon N.",
    initial: "D",
    entries: 22,
    days: 28,
    lastSession: "11 days ago",
  },
];

const STATS = [
  { label: "Active clients", value: "4", trend: "+1 this month" },
  { label: "Briefs ready", value: "2", trend: "before tomorrow" },
  { label: "Entries this week", value: "23", trend: "across 4 clients" },
  { label: "Engagement", value: "84%", trend: "above average" },
];

const SCHEDULE = [
  { time: "9:00 AM", client: "Maya R.", initial: "M", duration: "50 min", brief: true },
  { time: "11:00 AM", client: "Aisha P.", initial: "A", duration: "50 min", brief: false },
  { time: "2:00 PM", client: "Devon N.", initial: "D", duration: "50 min", brief: true },
  { time: "4:00 PM", client: "James K.", initial: "J", duration: "50 min", brief: false },
];

export default async function TodayPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const firstName = session?.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <DateGreeting name={firstName} />

      <p
        className="text-ink-soft mb-9 text-[16px] font-medium md:text-[17px]"
        style={{ letterSpacing: "-0.005em" }}
      >
        You have <strong className="text-accent font-bold">{READY_BRIEFS.length} briefs</strong>{" "}
        ready to read before your sessions tomorrow.
      </p>

      <StatsGrid />
      <ReadyToRead />
      <TomorrowSchedule />
    </div>
  );
}

function StatsGrid() {
  return (
    <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
      {STATS.map((s) => (
        <div key={s.label} className="bg-surface border-border rounded-2xl border px-5 py-5">
          <div className="text-ink-mute mb-2 text-[11px] font-semibold uppercase tracking-[0.04em]">
            {s.label}
          </div>
          <div
            className="display text-ink text-[28px] font-medium leading-none md:text-[32px]"
            style={{ letterSpacing: "-0.025em" }}
          >
            {s.value}
          </div>
          <div className="text-ink-mute mt-1.5 text-[11px] font-medium">{s.trend}</div>
        </div>
      ))}
    </div>
  );
}

function ReadyToRead() {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="display text-ink m-0 text-[20px] font-medium md:text-[22px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          Ready to read
        </h2>
        <span className="text-ink-mute text-[12px] font-medium">{READY_BRIEFS.length} briefs</span>
      </div>

      <div className="flex flex-col gap-3">
        {READY_BRIEFS.map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="card-warm bg-surface border-border flex items-center gap-4 rounded-2xl border px-5 py-5 transition-colors md:px-6"
          >
            <div className="display bg-accent-bg text-accent flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[18px] font-medium">
              {c.initial}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="display text-ink mb-1 text-[18px] font-medium"
                style={{ letterSpacing: "-0.015em" }}
              >
                {c.name}
              </div>
              <div className="text-ink-mute text-[12px] font-medium">
                {c.entries} entries · {c.days} days · last session {c.lastSession}
              </div>
            </div>
            <div className="bg-accent-bg hidden items-center gap-1.5 rounded-full px-3 py-[5px] sm:flex">
              <span className="bg-accent h-[5px] w-[5px] rounded-full" />
              <span className="text-accent text-[11px] font-semibold">Brief ready</span>
            </div>
            <ChevronRight size={16} strokeWidth={1.75} className="text-ink-mute flex-shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function TomorrowSchedule() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="display text-ink m-0 text-[20px] font-medium md:text-[22px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          Tomorrow&apos;s schedule
        </h2>
        <Link
          href="/calendar"
          className="text-ink-soft border-border tracking-body hover:text-ink inline-flex items-center justify-center gap-2 rounded-full border bg-transparent px-[18px] py-[9px] font-sans text-[13px] font-medium"
        >
          View calendar
        </Link>
      </div>

      <div className="bg-surface border-border overflow-hidden rounded-2xl border">
        {SCHEDULE.map((s, i) => (
          <div
            key={s.time}
            className={[
              "flex items-center gap-4 px-5 py-4 md:px-6",
              i < SCHEDULE.length - 1 ? "border-border-soft border-b" : "",
            ].join(" ")}
          >
            <div
              className="display text-ink w-[80px] flex-shrink-0 text-[15px] font-medium md:text-[16px]"
              style={{ letterSpacing: "-0.015em" }}
            >
              {s.time}
            </div>
            <div className="display bg-surface-deep text-ink-soft flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-medium">
              {s.initial}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="text-ink text-[14px] font-semibold"
                style={{ letterSpacing: "-0.005em" }}
              >
                {s.client}
              </div>
              <div className="text-ink-mute text-[11px] font-medium">{s.duration}</div>
            </div>
            {s.brief ? (
              <div className="bg-accent-bg flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1">
                <span className="bg-accent h-[5px] w-[5px] rounded-full" />
                <span className="text-accent text-[10px] font-semibold">Brief ready</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
