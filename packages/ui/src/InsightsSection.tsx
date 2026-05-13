import { AlertCircle, ArrowRight, BookOpen, Brain, Heart, Target, TrendingUp } from "lucide-react";

import { Eyebrow } from "./Eyebrow";
import { Reveal } from "./Reveal";

const INSIGHTS = [
  { icon: Heart, label: "Emotional", desc: "Dominant feelings, shifts, contradictions" },
  { icon: Brain, label: "Cognitive", desc: "Thinking styles, distortions" },
  { icon: Target, label: "Behavioral", desc: "People, situations, time patterns" },
  { icon: AlertCircle, label: "Avoidance", desc: "Engagement drops, narrowing" },
  { icon: BookOpen, label: "Narrative", desc: "Identity & agency language" },
  { icon: TrendingUp, label: "Progress", desc: "Vocabulary, depth, change" },
];

export function InsightsSection() {
  return (
    <Reveal>
      <section id="for-therapists" className="px-5 py-16 md:px-10 md:py-[100px]">
        <div
          className="mx-auto grid max-w-[1100px] items-center gap-10 md:gap-16"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}
        >
          <div>
            <div className="mb-4">
              <Eyebrow flanked={false}>What you see</Eyebrow>
            </div>
            <h2
              className="display m-0 mb-5 font-medium"
              style={{
                fontSize: "clamp(32px, 4.5vw, 48px)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              Seven quiet windows
              <br />
              into your client&apos;s week.
            </h2>
            <p className="text-ink-soft tracking-body mb-7 text-base" style={{ lineHeight: 1.65 }}>
              Each brief is built from observations across seven clinical insight areas. Nothing
              diagnostic — just patterns, surfaced calmly, with calibrated confidence on every
              claim.
            </p>
            <a
              href="/signup"
              className="text-accent inline-flex items-center gap-1.5 text-[14px] font-semibold transition-all hover:gap-2.5"
            >
              See it in action <ArrowRight size={14} strokeWidth={1.75} />
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {INSIGHTS.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.label}
                  className="card-warm bg-surface border-border rounded-2xl border px-[22px] py-5"
                >
                  <div className="bg-accent-bg mb-3 flex h-9 w-9 items-center justify-center rounded-[10px]">
                    <Icon size={15} strokeWidth={1.75} className="text-accent" />
                  </div>
                  <div
                    className="display text-ink mb-1 text-base font-medium"
                    style={{ letterSpacing: "-0.015em" }}
                  >
                    {a.label}
                  </div>
                  <div
                    className="text-ink-mute text-[12px]"
                    style={{ lineHeight: 1.5, letterSpacing: "-0.003em" }}
                  >
                    {a.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

export default InsightsSection;
