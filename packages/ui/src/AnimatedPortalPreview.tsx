"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Brain,
  Heart,
  LayoutDashboard,
  MoreHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { Logo } from "./Logo";

const SIDEBAR_NAV = [
  { icon: LayoutDashboard, label: "Today" },
  { icon: Users, label: "Clients", active: true },
  { icon: Sparkles, label: "Suggestions" },
  { icon: BookOpen, label: "Templates" },
  { icon: TrendingUp, label: "Trends" },
];

const ACTIVE_CLIENTS = [
  { name: "Maya R.", initial: "M", active: true, status: "ready" as const },
  { name: "James K.", initial: "J", status: "data" as const },
  { name: "Aisha P.", initial: "A", status: "wait" as const },
  { name: "Devon N.", initial: "D", status: "ready" as const },
];

const STATUS_COLOR: Record<"ready" | "data" | "wait", string> = {
  ready: "var(--sage)",
  data: "var(--warm)",
  wait: "var(--ink-faint)",
};

const BRIEF_STEPS = [
  "analyzing emotions...",
  "detecting shifts...",
  "checking contradictions...",
  "ready",
];

const BRIEF_TEXT = [
  "Maya's entries this period are dominated by frustration directed at her partner...",
  "Maya's entries this period are dominated by frustration directed at her partner and a recurring sense of being stuck. Around April 26, the tone shifted...",
  "Maya's entries this period are dominated by frustration directed at her partner and a recurring sense of being stuck. Around April 26, the tone shifted — from active frustration to a flatter, more resigned register. The word \u201cempty\u201d appeared...",
  "Maya's entries this period are dominated by frustration directed at her partner and a recurring sense of being stuck. Around April 26, the tone shifted — from active frustration to a flatter, more resigned register. The word \u201cempty\u201d appeared for the first time in twelve weeks of journaling.",
];

const INSIGHT_BARS = [
  { icon: Heart, label: "Emotional", w: "85%", note: "Shift detected" },
  { icon: Brain, label: "Cognitive", w: "62%", note: "Rumination patterns" },
  { icon: Target, label: "Behavioral", w: "78%", note: "Trigger: weekends" },
  { icon: AlertCircle, label: "Avoidance", w: "45%", note: "Mild engagement drop" },
];

const DEMO_ENTRIES = [
  {
    date: "Apr 26",
    emotion: "frustrated · 8/10",
    text: "Another one of those days. Why does this keep happening? I keep thinking it'll be different and it never is...",
  },
  {
    date: "Apr 27",
    emotion: "empty · 7/10",
    text: "Just empty today. Couldn't get out of bed until 2.",
  },
  {
    date: "Apr 28",
    emotion: "anxious · 6/10",
    text: "Couldn't sleep. Kept replaying the argument. My chest felt tight for hours...",
  },
];

const TREND_STATS = [
  { label: "Avg intensity", val: "6.4", trend: "−0.8" },
  { label: "Vocabulary", val: "+12%", trend: "richer" },
  { label: "Engagement", val: "73%", trend: "stable" },
];

export function AnimatedPortalPreview() {
  const [briefStep, setBriefStep] = useState(0);
  const [portalTab, setPortalTab] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setBriefStep((s) => (s + 1) % 4), 2400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPortalTab((s) => (s + 1) % 3), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative px-5 pb-16 md:px-10 md:pb-[100px]">
      <div
        className="fade d6 bg-surface-warm border-border mx-auto max-w-[1200px] rounded-[28px] border p-2"
        style={{ boxShadow: "0 40px 100px color-mix(in oklab, var(--accent) 12%, transparent)" }}
      >
        {/* Browser chrome */}
        <div className="flex items-center justify-between px-5 pb-3.5 pt-2.5">
          <div className="flex gap-1.5">
            <div className="h-[11px] w-[11px] rounded-full" style={{ background: "#FF5F57" }} />
            <div className="h-[11px] w-[11px] rounded-full" style={{ background: "#FEBC2E" }} />
            <div className="h-[11px] w-[11px] rounded-full" style={{ background: "#28C840" }} />
          </div>
          <div className="text-ink-faint bg-surface border-border-soft rounded-lg border px-3.5 py-1 text-[11px] font-medium">
            app.attuna.io/clients/maya
          </div>
          <div className="w-[33px]" aria-hidden="true" />
        </div>

        <div className="bg-surface border-border-soft flex min-h-[580px] overflow-hidden rounded-[20px] border">
          {/* Sidebar — hidden on mobile to give the main pane full width */}
          <div className="bg-bg-soft border-border hidden w-[220px] flex-shrink-0 border-r px-3.5 py-5 md:block">
            <div className="border-border-soft mb-4 border-b px-2 pb-4">
              <Logo small />
            </div>
            <div className="text-ink-faint mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.05em]">
              Workspace
            </div>
            {SIDEBAR_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={[
                    "mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors",
                    item.active
                      ? "bg-accent-bg text-accent font-semibold"
                      : "text-ink-soft font-medium",
                  ].join(" ")}
                >
                  <Icon size={13} strokeWidth={1.75} />
                  {item.label}
                </div>
              );
            })}

            <div className="text-ink-faint mt-2 px-2 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.05em]">
              Active Clients
            </div>
            {ACTIVE_CLIENTS.map((c) => (
              <div
                key={c.name}
                className={[
                  "mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px]",
                  c.active ? "bg-accent-bg text-accent font-semibold" : "text-ink-soft font-medium",
                ].join(" ")}
              >
                <div
                  className="display flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
                  style={{
                    background: c.active ? "var(--accent)" : "var(--surface-deep)",
                    color: c.active ? "var(--ink-on-accent)" : "var(--ink-mute)",
                  }}
                >
                  {c.initial}
                </div>
                <span className="flex-1">{c.name}</span>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: STATUS_COLOR[c.status] }}
                />
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex flex-1 flex-col">
            <div className="border-border flex items-center justify-between border-b px-7 py-5">
              <div className="flex items-center gap-3">
                <div className="display bg-accent-bg text-accent flex h-9 w-9 items-center justify-center rounded-full text-base font-medium">
                  M
                </div>
                <div>
                  <div
                    className="display text-ink text-base font-medium"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    Maya R.
                  </div>
                  <div className="text-ink-mute text-[11px] font-medium">
                    Active · 14 entries · 19 days
                  </div>
                </div>
              </div>
              <div className="bg-accent-bg flex items-center gap-1.5 rounded-full px-3 py-[5px]">
                <span className="bg-accent h-[5px] w-[5px] rounded-full" />
                <span className="text-accent text-[11px] font-semibold">Brief ready</span>
              </div>
            </div>

            <div className="border-border flex border-b px-7">
              {(["Brief", "Entries", "Trends"] as const).map((tab, i) => (
                <div
                  key={tab}
                  className={[
                    "tracking-body px-[18px] py-3 text-[13px] transition-all duration-300",
                    portalTab === i
                      ? "text-accent border-accent border-b-2 font-semibold"
                      : "text-ink-mute border-b-2 border-transparent font-medium",
                  ].join(" ")}
                >
                  {tab}
                </div>
              ))}
            </div>

            <div className="relative flex-1 overflow-hidden p-7">
              {portalTab === 0 && (
                <div className="fade-in" key="brief">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-warm mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em]">
                        ✦ Session brief
                      </div>
                      <div className="text-ink-mute text-[12px]">
                        Generated 10:30 PM · Tuesday May 5
                      </div>
                    </div>
                    <div className="text-ink-faint text-[11px] font-medium">
                      {BRIEF_STEPS[briefStep]}
                    </div>
                  </div>

                  <div className="bg-bg-soft border-border-soft mb-4 rounded-2xl border px-[26px] py-[22px]">
                    <p
                      key={briefStep}
                      className="display fade-in text-ink m-0 text-base font-normal"
                      style={{ lineHeight: 1.6, letterSpacing: "-0.01em" }}
                    >
                      {BRIEF_TEXT[briefStep]}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {INSIGHT_BARS.map((d, i) => {
                      const Icon = d.icon;
                      return (
                        <div
                          key={d.label}
                          className="bg-surface border-border-soft rounded-xl border px-3.5 py-3"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Icon size={12} strokeWidth={2} className="text-accent" />
                            <span className="text-ink tracking-body text-[12px] font-semibold">
                              {d.label}
                            </span>
                          </div>
                          <div className="bg-surface-deep mb-1.5 h-1 overflow-hidden rounded-sm">
                            <div
                              className="grow-bar bg-accent h-full rounded-sm"
                              key={`${portalTab}-${i}`}
                              style={{ width: d.w }}
                            />
                          </div>
                          <div className="text-ink-mute text-[10px] font-medium">{d.note}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {portalTab === 1 && (
                <div className="fade-in" key="entries">
                  <div className="mb-4">
                    <div className="text-warm mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em]">
                      ✦ 14 entries this period
                    </div>
                    <div className="text-ink-mute text-[12px]">Read in chronological order</div>
                  </div>
                  {DEMO_ENTRIES.map((entry, i) => (
                    <div
                      key={entry.date}
                      className="fade bg-bg-soft border-border-soft mb-2.5 rounded-[14px] border px-[18px] py-4"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-ink-mute text-[11px] font-medium tracking-[0.03em]">
                          {entry.date} · {entry.emotion}
                        </div>
                        <MoreHorizontal size={12} className="text-ink-faint" />
                      </div>
                      <p
                        className="display-text text-ink-soft m-0 text-[13px] font-normal"
                        style={{ lineHeight: 1.6 }}
                      >
                        &ldquo;{entry.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {portalTab === 2 && (
                <div className="fade-in" key="trends">
                  <div className="mb-4">
                    <div className="text-warm mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em]">
                      ✦ Emotional trajectory
                    </div>
                    <div className="text-ink-mute text-[12px]">Last 30 days</div>
                  </div>
                  <div className="bg-bg-soft border-border-soft relative h-[200px] rounded-[14px] border px-4 py-5">
                    <svg viewBox="0 0 400 140" className="h-full w-full" aria-hidden="true">
                      <defs>
                        <linearGradient id="warmArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0, 35, 70, 105, 140].map((y) => (
                        <line
                          key={y}
                          x1="0"
                          y1={y}
                          x2="400"
                          y2={y}
                          stroke="var(--border-soft)"
                          strokeWidth="0.5"
                          strokeDasharray="2 4"
                        />
                      ))}
                      <path
                        d="M 0 80 L 30 70 L 60 60 L 90 75 L 120 65 L 150 55 L 180 70 L 210 90 L 240 100 L 270 95 L 300 85 L 330 110 L 360 120 L 400 115 L 400 140 L 0 140 Z"
                        fill="url(#warmArea)"
                      />
                      <path
                        d="M 0 80 L 30 70 L 60 60 L 90 75 L 120 65 L 150 55 L 180 70 L 210 90 L 240 100 L 270 95 L 300 85 L 330 110 L 360 120 L 400 115"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <circle cx="240" cy="100" r="6" fill="var(--warm)" className="pulse" />
                      <line
                        x1="240"
                        y1="100"
                        x2="240"
                        y2="20"
                        stroke="var(--warm)"
                        strokeWidth="1.5"
                        strokeDasharray="2 3"
                        opacity="0.5"
                      />
                      <text
                        x="240"
                        y="14"
                        textAnchor="middle"
                        fontSize="10"
                        fill="var(--warm)"
                        fontFamily="var(--font-sans), sans-serif"
                        fontWeight="600"
                      >
                        SHIFT
                      </text>
                    </svg>
                  </div>
                  <div className="mt-3.5 grid grid-cols-3 gap-2">
                    {TREND_STATS.map((s) => (
                      <div
                        key={s.label}
                        className="bg-surface border-border-soft rounded-xl border px-3.5 py-3"
                      >
                        <div className="text-ink-mute mb-1.5 text-[10px] font-semibold uppercase tracking-[0.04em]">
                          {s.label}
                        </div>
                        <div
                          className="display text-ink text-[22px] font-medium leading-none"
                          style={{ letterSpacing: "-0.02em" }}
                        >
                          {s.val}
                        </div>
                        <div className="text-sage mt-1 text-[11px] font-medium">{s.trend}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-border-soft flex justify-center gap-1.5 border-t px-7 pb-4 pt-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[5px] rounded-[3px] transition-all duration-300"
                  style={{
                    width: portalTab === i ? 24 : 5,
                    background: portalTab === i ? "var(--accent)" : "var(--border-soft)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <p
        className="display-text text-ink-mute mx-auto mt-8 max-w-[600px] text-center text-[14px] font-normal"
        style={{ lineHeight: 1.6 }}
      >
        A live preview of your workspace.
      </p>
    </section>
  );
}

export default AnimatedPortalPreview;
