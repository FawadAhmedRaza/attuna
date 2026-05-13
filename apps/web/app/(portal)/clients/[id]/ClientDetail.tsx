"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Flag, MoreHorizontal, Plus, Send, X } from "lucide-react";

import { PillButton } from "@attuna/ui/PillButton";
import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { Textarea } from "@attuna/ui/Textarea";

import { PageHeader } from "../../_components/PageHeader";
import { ScheduleSessionModal } from "./ScheduleSessionModal";

import {
  CLIENT_SUGGESTIONS,
  CROSS_SESSION_THEMES,
  INSIGHT_DETAIL_AREAS,
  LONGITUDINAL,
  PAST_BRIEFS,
  RADAR_PROFILE,
  getClientById,
  type ClientEntry,
  type ClientMock,
  type ClientSuggestion,
  type Confidence,
  type CrossSessionTheme,
  type InsightArea,
  type InsightDetailArea,
} from "../_mock";

type Tab = "brief" | "insights" | "entries" | "trends" | "suggestions" | "history" | "notes";

export function ClientDetail({ id }: { id: string }) {
  const client = getClientById(id) as ClientMock;
  const [tab, setTab] = useState<Tab>("brief");
  const [scheduling, setScheduling] = useState(false);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "brief", label: "Brief", count: client.briefBody ? 1 : 0 },
    { id: "insights", label: "Insights", count: INSIGHT_DETAIL_AREAS.length },
    { id: "entries", label: "Entries", count: client.recentEntries.length },
    { id: "trends", label: "Trends" },
    { id: "suggestions", label: "Suggestions", count: (CLIENT_SUGGESTIONS[id] ?? []).length },
    { id: "history", label: "History", count: PAST_BRIEFS.length },
    { id: "notes", label: "Notes", count: client.notes.length },
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Client"
        title={client.name}
        subtitle={`Active · ${client.entries} entries over ${client.days} days · Last session ${client.lastSession}`}
        action={
          <>
            <PillButton
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              aria-label="Export current view as PDF"
            >
              Export PDF
            </PillButton>
            <PillButton variant="primary" size="sm" onClick={() => setScheduling(true)}>
              Schedule session
            </PillButton>
          </>
        }
      />

      <div className="border-border print-hide mb-8 flex gap-1 overflow-x-auto border-b">
        {tabs.map((tb) => {
          const active = tab === tb.id;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={[
                "tracking-body -mb-px flex flex-shrink-0 items-center gap-2 px-4 py-3 text-[14px] transition-colors md:px-5",
                active
                  ? "border-accent text-accent border-b-2 font-semibold"
                  : "text-ink-mute hover:text-ink-soft border-b-2 border-transparent font-medium",
              ].join(" ")}
            >
              {tb.label}
              {typeof tb.count === "number" && tb.count > 0 ? (
                <span
                  className={[
                    "rounded-full px-1.5 py-px text-[10px] font-semibold",
                    active ? "bg-accent-bg text-accent" : "bg-surface-deep text-ink-mute",
                  ].join(" ")}
                >
                  {tb.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="fade-in" key={tab}>
        {tab === "brief" && <BriefTab client={client} />}
        {tab === "insights" && <InsightsTab />}
        {tab === "entries" && <EntriesTab client={client} />}
        {tab === "trends" && <TrendsTab client={client} />}
        {tab === "suggestions" && <SuggestionsTab clientId={id} />}
        {tab === "history" && <HistoryTab />}
        {tab === "notes" && <NotesTab client={client} />}
      </div>

      <ScheduleSessionModal
        open={scheduling}
        onClose={() => setScheduling(false)}
        clientName={client.name}
      />
    </div>
  );
}

// ─── Brief ────────────────────────────────────────────────────────────

function BriefTab({ client }: { client: ClientMock }) {
  if (!client.briefBody) {
    return (
      <div className="bg-surface border-border rounded-[20px] border p-8 md:p-12">
        <p
          className="display text-ink m-0 mb-3 text-[24px] font-medium"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Not enough yet.
        </p>
        <p className="text-ink-soft tracking-body text-[15px]" style={{ lineHeight: 1.65 }}>
          {client.name.split(" ")[0]} has written {client.entries} entries over {client.days} days.
          Briefs become available after at least five entries — usually within a week of consistent
          journaling.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <BriefHero client={client} />
      <InsightsList areas={client.insights} />
      <SuggestedTopics topics={client.suggestedTopics} />
    </div>
  );
}

function BriefHero({ client }: { client: ClientMock }) {
  return (
    <div className="bg-surface border-border rounded-[20px] border p-7 md:p-9">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-ink-mute text-[11px] font-semibold uppercase tracking-[0.04em]">
          Session brief · prepared {client.briefPreparedAt}
        </div>
        <div className="print-hide">
          <MoreButton />
        </div>
      </div>

      <p className="text-ink tracking-body m-0 mb-6 text-[15px]" style={{ lineHeight: 1.65 }}>
        {client.briefBody}
      </p>

      <div className="border-border-soft text-ink-mute flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[12px]">
        <span>
          <span className="text-ink-soft font-medium">{client.entries}</span> entries
        </span>
        <span className="text-ink-faint" aria-hidden="true">
          ·
        </span>
        <span>
          <span className="text-ink-soft font-medium">{client.days}</span> days observed
        </span>
        <span className="text-ink-faint" aria-hidden="true">
          ·
        </span>
        <span>
          <span className="text-ink-soft font-medium">{lastSessionDays(client.lastSession)}</span>{" "}
          days since session
        </span>
      </div>
    </div>
  );
}

function InsightsList({ areas }: { areas: InsightArea[] }) {
  return (
    <section>
      <h2
        className="display text-ink m-0 mb-4 text-[20px] font-medium md:text-[22px]"
        style={{ letterSpacing: "-0.02em" }}
      >
        Insight areas
      </h2>
      <div className="flex flex-col gap-3">
        {areas.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.label}
              className="bg-surface border-border rounded-2xl border px-6 py-6 md:px-7"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="bg-accent-bg flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]">
                  <Icon size={16} strokeWidth={1.75} className="text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="display text-ink text-[16px] font-medium"
                    style={{ letterSpacing: "-0.015em" }}
                  >
                    {a.label}
                  </div>
                  <div className="text-ink-mute text-[12px] font-medium">{a.note}</div>
                </div>
                <ConfidencePill level={a.confidence} />
              </div>
              <p
                className="text-ink-soft tracking-body mt-3 text-[14px]"
                style={{ lineHeight: 1.6 }}
              >
                {a.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ConfidencePill({ level }: { level: Confidence }) {
  return (
    <span className="bg-bg-soft border-border-soft text-ink-mute inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium">
      {level} confidence
    </span>
  );
}

function SuggestedTopics({ topics }: { topics: string[] }) {
  if (topics.length === 0) return null;
  return (
    <section>
      <h2
        className="display text-ink m-0 mb-4 text-[20px] font-medium md:text-[22px]"
        style={{ letterSpacing: "-0.02em" }}
      >
        Possible topics for tomorrow
      </h2>
      <div className="bg-surface border-border rounded-2xl border px-6 py-6 md:px-7">
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {topics.map((q) => (
            <li
              key={q}
              className="text-ink-soft tracking-body flex gap-3 text-[14px]"
              style={{ lineHeight: 1.6 }}
            >
              <Flag
                size={13}
                strokeWidth={1.75}
                className="text-ink-faint mt-1 flex-shrink-0"
                aria-hidden="true"
              />
              <span>{q}</span>
            </li>
          ))}
        </ul>
        <p className="text-ink-mute border-border-soft mt-5 border-t pt-4 text-[12px] italic">
          Observations, not directives. Your clinical judgment leads.
        </p>
      </div>
    </section>
  );
}

// ─── Insights (deep view) ─────────────────────────────────────────────

function InsightsTab() {
  const [activeId, setActiveId] = useState<string>(INSIGHT_DETAIL_AREAS[0]!.id);
  const current = INSIGHT_DETAIL_AREAS.find((a) => a.id === activeId) ?? INSIGHT_DETAIL_AREAS[0]!;
  const Icon = current.icon;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr] md:gap-8">
      <nav aria-label="Insight areas" className="min-w-0">
        <div className="text-ink-faint mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.06em]">
          Insight areas
        </div>
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:p-0">
          {INSIGHT_DETAIL_AREAS.map((a) => {
            const active = a.id === activeId;
            const A = a.icon;
            return (
              <li key={a.id} className="shrink-0 md:shrink">
                <button
                  type="button"
                  onClick={() => setActiveId(a.id)}
                  className={[
                    "flex items-center gap-2.5 whitespace-nowrap rounded-[10px] border px-3.5 py-2 text-[13px] font-medium transition-colors",
                    "md:w-full md:justify-start md:border-transparent",
                    active
                      ? "bg-accent-bg border-accent text-accent"
                      : "bg-surface border-border text-ink-soft hover:text-ink md:hover:bg-bg-soft md:bg-transparent",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  <A
                    size={14}
                    strokeWidth={1.75}
                    className={active ? "text-accent" : "text-ink-mute"}
                  />
                  {a.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="bg-surface border-border min-w-0 rounded-2xl border p-7 md:p-9">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-accent-bg flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px]">
            <Icon size={20} strokeWidth={1.75} className="text-accent" />
          </div>
          <h2
            className="display text-ink m-0 text-[22px] font-medium md:text-[24px]"
            style={{ letterSpacing: "-0.015em" }}
          >
            {current.label}
          </h2>
        </div>

        <div className="bg-surface-warm mb-6 rounded-[10px] p-5">
          <p
            className="display-md text-ink m-0 text-[17px] font-normal md:text-[18px]"
            style={{ letterSpacing: "-0.005em", lineHeight: 1.55 }}
          >
            {current.summary}
          </p>
        </div>

        {current.items.length > 0 ? (
          <div className="flex flex-col gap-3">
            {current.items.map((item) => (
              <InsightItemCard key={item.label} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-ink-mute m-0 text-[13px] font-medium italic">
            No items yet. Add a guidance note from the Suggestions tab.
          </p>
        )}
      </div>
    </div>
  );
}

function InsightItemCard({ item }: { item: InsightDetailArea["items"][number] }) {
  return (
    <div className="bg-bg-soft border-border-soft rounded-[10px] border px-5 py-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h4
          className="display text-ink m-0 text-[15px] font-medium md:text-[16px]"
          style={{ letterSpacing: "-0.012em" }}
        >
          {item.label}
        </h4>
        <ConfidencePill level={item.confidence} />
      </div>
      {item.frequency ? (
        <div className="text-ink-mute text-[12px] font-medium">{item.frequency}</div>
      ) : null}
      {item.quotes && item.quotes.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {item.quotes.map((q, i) => (
            <div
              key={i}
              className="display-md text-ink-soft border-accent border-l-2 pl-3 text-[14px] italic"
              style={{ lineHeight: 1.5 }}
            >
              &ldquo;{q}&rdquo;
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Entries (Journal) ────────────────────────────────────────────────

function EntriesTab({ client }: { client: ClientMock }) {
  const [filter, setFilter] = useState<"all" | "flagged">("all");
  const [selected, setSelected] = useState<string | null>(null);

  // If the selected id no longer exists in the entries list (e.g. after data
  // reloads or HMR), drop the selection. Doing this in an effect rather than
  // during render avoids React's "setState during render" violation.
  const selectedEntry = selected
    ? (client.recentEntries.find((e) => (e.id ?? e.date) === selected) ?? null)
    : null;
  useEffect(() => {
    if (selected && !selectedEntry) setSelected(null);
  }, [selected, selectedEntry]);

  if (client.recentEntries.length === 0) {
    return (
      <div className="bg-surface border-border rounded-[20px] border p-8 text-center md:p-12">
        <p className="text-ink-soft text-[14px]">No entries yet.</p>
      </div>
    );
  }

  const flaggedCount = client.recentEntries.filter((e) => e.flagged).length;

  if (selectedEntry) {
    return <EntryDetail entry={selectedEntry} onBack={() => setSelected(null)} />;
  }

  const list =
    filter === "flagged" ? client.recentEntries.filter((e) => e.flagged) : client.recentEntries;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterButton
          label="All entries"
          count={client.recentEntries.length}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <FilterButton
          label="Flagged"
          count={flaggedCount}
          active={filter === "flagged"}
          onClick={() => setFilter("flagged")}
        />
      </div>

      {list.length === 0 ? (
        <div className="bg-surface border-border rounded-[14px] border p-8 text-center">
          <p className="text-ink-soft text-[14px]">No flagged entries.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((entry) => (
            <button
              key={entry.id ?? entry.date}
              type="button"
              onClick={() => setSelected(entry.id ?? entry.date)}
              className="bg-surface border-border hover:border-accent rounded-[14px] border px-6 py-5 text-left transition-colors md:px-7"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="display text-ink text-[16px] font-medium md:text-[17px]"
                    style={{ letterSpacing: "-0.012em" }}
                  >
                    {entry.date}
                  </span>
                  {entry.time ? (
                    <span className="text-ink-mute font-mono text-[12px]">{entry.time}</span>
                  ) : null}
                  {typeof entry.intensity === "number" ? (
                    <IntensityBadge value={entry.intensity} emotion={entry.emotion} />
                  ) : null}
                  {entry.flagged ? (
                    <span className="bg-warm-bg text-warm inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      <Flag size={9} strokeWidth={2.5} /> Flagged
                    </span>
                  ) : null}
                </div>
                {entry.id ? (
                  <span className="text-ink-mute font-mono text-[11px]">{entry.id}</span>
                ) : null}
              </div>
              <p
                className="text-ink-soft tracking-body m-0 line-clamp-2 text-[14px]"
                style={{ lineHeight: 1.55 }}
              >
                {entry.text}
              </p>
              {typeof entry.wordCount === "number" ? (
                <div className="text-ink-mute mt-2 font-mono text-[11px]">
                  {entry.wordCount} words
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-[10px] border px-3.5 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-ink text-bg border-ink"
          : "bg-surface text-ink-soft border-border hover:text-ink",
      ].join(" ")}
    >
      {label}
      <span className="font-mono text-[11px] opacity-70">{count}</span>
    </button>
  );
}

function IntensityBadge({ value, emotion }: { value: number; emotion: string }) {
  return (
    <span className="bg-surface-deep text-ink-soft border-border-soft inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
      {emotion}
      <span className="text-ink-mute font-mono">{value}/10</span>
    </span>
  );
}

function EntryDetail({ entry, onBack }: { entry: ClientEntry; onBack: () => void }) {
  return (
    <div className="max-w-[760px]">
      <button
        type="button"
        onClick={onBack}
        className="text-ink-mute hover:text-ink-soft mb-5 inline-flex items-center gap-2 text-[12px] font-medium transition-colors"
      >
        <ArrowLeft size={12} strokeWidth={2} /> All entries
      </button>

      <div className="bg-surface border-border rounded-2xl border p-7 md:p-9">
        <div className="border-border-soft mb-6 flex items-start justify-between gap-3 border-b pb-5">
          <div>
            <div
              className="display text-ink text-[22px] font-medium md:text-[24px]"
              style={{ letterSpacing: "-0.015em" }}
            >
              {entry.date}
            </div>
            <div className="text-ink-mute mt-1 font-mono text-[12px]">
              {entry.time ?? "—"}
              {typeof entry.wordCount === "number" ? ` · ${entry.wordCount} words` : ""}
            </div>
          </div>
          {entry.id ? (
            <span className="bg-bg-soft border-border text-ink-soft inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px]">
              {entry.id}
            </span>
          ) : null}
        </div>

        {typeof entry.intensity === "number" ? (
          <div className="mb-6">
            <div className="text-ink-faint mb-2 text-[10px] font-semibold uppercase tracking-[0.06em]">
              Tagged emotion
            </div>
            <div className="flex flex-wrap gap-2">
              <IntensityBadge value={entry.intensity} emotion={entry.emotion} />
            </div>
          </div>
        ) : null}

        {entry.flagged ? (
          <div className="bg-warm-bg mb-6 flex items-start gap-3 rounded-[10px] px-4 py-3">
            <Flag size={14} strokeWidth={1.75} className="text-warm mt-0.5" />
            <div>
              <div className="text-warm font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
                Flagged for review
              </div>
              {entry.flagReason ? (
                <div
                  className="text-ink-soft mt-1 text-[13px] font-medium"
                  style={{ letterSpacing: "-0.005em" }}
                >
                  {entry.flagReason}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <p
          className="display-md text-ink m-0 whitespace-pre-wrap text-[17px] font-normal md:text-[18px]"
          style={{ letterSpacing: "-0.003em", lineHeight: 1.65 }}
        >
          {entry.text}
        </p>
      </div>
    </div>
  );
}

// ─── Trends ───────────────────────────────────────────────────────────

function TrendsTab({ client }: { client: ClientMock }) {
  const enoughData = client.recentEntries.length >= 5 || client.briefBody !== null;

  if (!enoughData) {
    return (
      <div className="bg-surface border-border rounded-[20px] border p-8 md:p-12">
        <p
          className="display text-ink m-0 mb-3 text-[22px] font-medium"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Trends arrive with more entries.
        </p>
        <p className="text-ink-soft tracking-body text-[15px]" style={{ lineHeight: 1.65 }}>
          Patterns become reliable around five entries. Until then, the chart would mislead more
          than help.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TrendStat
          label="Avg intensity"
          value={client.trends.avgIntensity}
          trend={client.trends.intensityDelta}
        />
        <TrendStat
          label="Vocabulary range"
          value={client.trends.vocabulary}
          trend={client.trends.vocabularyTrend}
        />
        <TrendStat
          label="Engagement rate"
          value={client.trends.engagement}
          trend={client.trends.engagementTrend}
        />
      </div>

      <ChartCard title="Emotional intensity over time" subtitle="Twelve weeks · weekly average">
        <LineChart data={LONGITUDINAL} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Insight profile" subtitle="Current vs eight weeks ago">
          <RadarProfile />
        </ChartCard>
        <ChartCard title="Cross-session themes" subtitle="Recurring patterns across briefs">
          <div className="flex flex-col gap-2">
            {CROSS_SESSION_THEMES.map((t) => (
              <ThemeRow key={t.theme} item={t} />
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function TrendStat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="bg-surface border-border rounded-[14px] border px-6 py-5">
      <div className="text-ink-mute mb-2 text-[10px] font-semibold uppercase tracking-[0.06em]">
        {label}
      </div>
      <div
        className="display text-ink text-[26px] font-medium leading-none md:text-[28px]"
        style={{ letterSpacing: "-0.025em" }}
      >
        {value}
      </div>
      <div className="text-sage mt-1.5 text-[11px] font-medium">{trend}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border-border rounded-2xl border p-6 md:p-7">
      <h3
        className="display text-ink m-0 text-[18px] font-medium md:text-[20px]"
        style={{ letterSpacing: "-0.015em" }}
      >
        {title}
      </h3>
      <p
        className="text-ink-mute mt-1 text-[12px] font-medium"
        style={{ letterSpacing: "-0.005em" }}
      >
        {subtitle}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function LineChart({ data }: { data: { week: string; intensity: number }[] }) {
  const width = 600;
  const height = 220;
  const pad = { top: 12, right: 12, bottom: 28, left: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = 10;
  const xFor = (i: number) => pad.left + (i / (data.length - 1)) * innerW;
  const yFor = (v: number) => pad.top + innerH - (v / max) * innerH;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(d.intensity).toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xFor(data.length - 1).toFixed(2)} ${pad.top + innerH} L ${pad.left} ${pad.top + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
      <defs>
        <linearGradient id="lc-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 2.5, 5, 7.5, 10].map((v) => {
        const y = yFor(v);
        return (
          <g key={v}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={pad.left - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-[var(--ink-mute)]"
              style={{ fontSize: 10, fontFamily: "var(--font-sans)" }}
            >
              {v}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#lc-area)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {data.map((d, i) => (
        <circle key={d.week} cx={xFor(i)} cy={yFor(d.intensity)} r={3} className="fill-accent" />
      ))}

      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text
            key={`l-${d.week}`}
            x={xFor(i)}
            y={pad.top + innerH + 16}
            textAnchor="middle"
            className="fill-[var(--ink-mute)]"
            style={{ fontSize: 10, fontFamily: "var(--font-sans)" }}
          >
            {d.week}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function RadarProfile() {
  const data = RADAR_PROFILE;
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = 95;
  const max = 10;

  const point = (i: number, frac: number) => {
    const a = (Math.PI * 2 * i) / data.length - Math.PI / 2;
    return { x: cx + Math.cos(a) * r * frac, y: cy + Math.sin(a) * r * frac };
  };

  const buildPolygon = (key: "current" | "baseline") =>
    data
      .map((d, i) => {
        const p = point(i, d[key] / max);
        return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      })
      .join(" ");

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-[360px]">
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const points = data
            .map((_, i) => {
              const p = point(i, frac);
              return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
            })
            .join(" ");
          return (
            <polygon
              key={frac}
              points={points}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}
        {data.map((_, i) => {
          const p = point(i, 1);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={buildPolygon("baseline")}
          fill="var(--ink-faint)"
          fillOpacity={0.18}
          stroke="var(--ink-faint)"
          strokeWidth={1}
        />
        <polygon
          points={buildPolygon("current")}
          fill="var(--accent)"
          fillOpacity={0.3}
          stroke="var(--accent)"
          strokeWidth={1.5}
        />

        {data.map((d, i) => {
          const p = point(i, 1.18);
          return (
            <text
              key={d.dimension}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[var(--ink-mute)]"
              style={{ fontSize: 10, fontFamily: "var(--font-sans)", fontWeight: 500 }}
            >
              {d.dimension}
            </text>
          );
        })}
      </svg>

      <div className="mt-3 flex justify-center gap-5 text-[11px] font-medium">
        <span className="text-ink-soft inline-flex items-center gap-1.5">
          <span className="bg-accent inline-block h-2 w-2 rounded-full" /> Current
        </span>
        <span className="text-ink-soft inline-flex items-center gap-1.5">
          <span className="bg-ink-faint inline-block h-2 w-2 rounded-full" /> Baseline
        </span>
      </div>
    </div>
  );
}

function ThemeRow({ item }: { item: CrossSessionTheme }) {
  const map: Record<CrossSessionTheme["status"], string> = {
    Recurring: "bg-surface-deep text-ink-soft",
    Increasing: "bg-warm-bg text-warm",
    Resolved: "bg-[var(--sage,#3d8b5a)]/10 text-sage",
    New: "bg-accent-bg text-accent",
  };
  return (
    <div className="bg-bg-soft border-border-soft flex items-center justify-between rounded-[10px] border px-4 py-3">
      <div className="min-w-0">
        <div className="text-ink text-[13px] font-semibold" style={{ letterSpacing: "-0.005em" }}>
          {item.theme}
        </div>
        <div className="text-ink-mute mt-0.5 font-mono text-[11px]">
          first {item.first} · {item.briefs} brief{item.briefs > 1 ? "s" : ""}
        </div>
      </div>
      <span
        className={[
          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
          map[item.status],
        ].join(" ")}
      >
        {item.status}
      </span>
    </div>
  );
}

// ─── Suggestions ──────────────────────────────────────────────────────

function SuggestionsTab({ clientId }: { clientId: string }) {
  const initial = CLIENT_SUGGESTIONS[clientId] ?? [];
  const [items, setItems] = useState<ClientSuggestion[]>(initial);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", theme: "", scheduledFor: "" });

  function reset() {
    setDraft({ title: "", body: "", theme: "", scheduledFor: "" });
    setComposing(false);
  }

  function send() {
    if (!draft.title.trim() || !draft.body.trim()) return;
    const id = `s_${Date.now()}`;
    const next: ClientSuggestion = draft.scheduledFor
      ? {
          id,
          title: draft.title.trim(),
          body: draft.body.trim(),
          theme: draft.theme.trim() || "general",
          status: "scheduled",
          scheduledFor: draft.scheduledFor,
        }
      : {
          id,
          title: draft.title.trim(),
          body: draft.body.trim(),
          theme: draft.theme.trim() || "general",
          status: "sent",
          acknowledged: false,
          sentAt: "today",
        };
    setItems([next, ...items]);
    reset();
  }

  return (
    <div className="max-w-[760px]">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2
            className="display text-ink m-0 text-[22px] font-medium md:text-[24px]"
            style={{ letterSpacing: "-0.015em" }}
          >
            Your suggestions
          </h2>
          <p
            className="text-ink-mute mt-1 text-[13px] font-medium"
            style={{ letterSpacing: "-0.005em" }}
          >
            {items.length} sent or scheduled · authored by you
          </p>
        </div>
        {!composing ? (
          <PillButton variant="primary" size="sm" onClick={() => setComposing(true)}>
            <Plus size={14} strokeWidth={1.75} /> New
          </PillButton>
        ) : null}
      </div>

      {composing ? (
        <div className="bg-surface border-border mb-4 rounded-2xl border p-6 md:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h3
              className="display text-ink m-0 text-[18px] font-medium"
              style={{ letterSpacing: "-0.015em" }}
            >
              Compose
            </h3>
            <button
              type="button"
              onClick={reset}
              aria-label="Close"
              className="text-ink-mute hover:text-ink rounded-md p-1 transition-colors"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <Field label="Title" htmlFor="sg-title">
              <Input
                id="sg-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="A short, calm title"
              />
            </Field>
            <Field label="Body" htmlFor="sg-body">
              <Textarea
                id="sg-body"
                rows={4}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="Speak as you would to your client. Brief, gentle, never directive."
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Theme" htmlFor="sg-theme">
                <Input
                  id="sg-theme"
                  value={draft.theme}
                  onChange={(e) => setDraft({ ...draft, theme: e.target.value })}
                  placeholder="emotional"
                />
              </Field>
              <Field label="Schedule for" htmlFor="sg-when" hint="Leave blank to send now">
                <Input
                  id="sg-when"
                  type="date"
                  value={draft.scheduledFor}
                  onChange={(e) => setDraft({ ...draft, scheduledFor: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <PillButton variant="ghost" size="sm" onClick={reset}>
                Cancel
              </PillButton>
              <PillButton variant="primary" size="sm" onClick={send}>
                <Send size={14} strokeWidth={1.75} />
                {draft.scheduledFor ? "Schedule" : "Send"}
              </PillButton>
            </div>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="bg-surface border-border rounded-2xl border p-8 text-center">
          <p className="text-ink-soft text-[14px]">No suggestions yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((s) => (
            <article
              key={s.id}
              className="bg-surface border-border rounded-2xl border px-6 py-5 md:px-7"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3
                  className="display text-ink m-0 text-[18px] font-medium md:text-[19px]"
                  style={{ letterSpacing: "-0.012em" }}
                >
                  {s.title}
                </h3>
                <SuggestionStatus item={s} />
              </div>
              <p
                className="display-md text-ink-soft m-0 mb-2 text-[15px] font-normal md:text-[16px]"
                style={{ letterSpacing: "-0.003em", lineHeight: 1.55 }}
              >
                {s.body}
              </p>
              <div className="text-ink-mute font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
                {s.theme}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionStatus({ item }: { item: ClientSuggestion }) {
  if (item.status === "scheduled") {
    return (
      <span className="bg-accent-bg text-accent inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold">
        Scheduled {item.scheduledFor ?? ""}
      </span>
    );
  }
  if (item.acknowledged) {
    return (
      <span className="bg-[var(--sage,#3d8b5a)]/10 text-sage inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold">
        Read
      </span>
    );
  }
  return (
    <span className="bg-surface-deep text-ink-soft inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold">
      Sent
    </span>
  );
}

// ─── History ──────────────────────────────────────────────────────────

function HistoryTab() {
  return (
    <div className="bg-surface border-border overflow-hidden rounded-2xl border">
      <div className="border-border border-b px-6 py-5 md:px-7">
        <h3
          className="display text-ink m-0 text-[20px] font-medium md:text-[22px]"
          style={{ letterSpacing: "-0.015em" }}
        >
          Past briefs
        </h3>
        <p
          className="text-ink-mute mt-1 text-[13px] font-medium"
          style={{ letterSpacing: "-0.005em" }}
        >
          Archive across sessions.
        </p>
      </div>
      <ul className="m-0 list-none p-0">
        {PAST_BRIEFS.map((b, i) => (
          <li
            key={b.id}
            className={["px-6 py-5 md:px-7", i > 0 ? "border-border-soft border-t" : ""].join(" ")}
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="display text-ink text-[16px] font-medium md:text-[17px]"
                  style={{ letterSpacing: "-0.012em" }}
                >
                  {b.date}
                </span>
                <span className="text-ink-mute font-mono text-[11px]">{b.id}</span>
              </div>
              <span className="text-ink-mute font-mono text-[11px]">prepared {b.preparedAt}</span>
            </div>
            <p className="text-ink-soft tracking-body m-0 text-[14px]" style={{ lineHeight: 1.6 }}>
              {b.excerpt}
            </p>
            <div className="text-ink-mute mt-2 font-mono text-[11px]">
              {b.entriesCovered} entries covered
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────

function NotesTab({ client }: { client: ClientMock }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <PillButton variant="outline" size="sm">
          <Plus size={14} strokeWidth={1.75} /> Add note
        </PillButton>
      </div>
      {client.notes.length === 0 ? (
        <div className="bg-surface border-border rounded-[14px] border px-6 py-8 text-center">
          <p className="text-ink-soft text-[14px]">No notes yet.</p>
        </div>
      ) : (
        client.notes.map((note) => (
          <div key={note.date} className="bg-surface border-border rounded-[14px] border px-6 py-5">
            <div className="text-ink-mute mb-2 text-[12px] font-semibold">{note.date}</div>
            <p
              className="display-text text-ink-soft tracking-body m-0 text-[14px] font-normal"
              style={{ lineHeight: 1.65 }}
            >
              {note.text}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────

function lastSessionDays(text: string): string {
  const m = text.match(/(\d+)/);
  return m ? m[1]! : "—";
}

function MoreButton() {
  return (
    <button
      type="button"
      aria-label="More"
      className="text-ink-mute hover:text-ink-soft rounded-md p-1 transition-colors"
    >
      <MoreHorizontal size={14} strokeWidth={1.75} />
    </button>
  );
}

void MoreButton;

export default ClientDetail;
