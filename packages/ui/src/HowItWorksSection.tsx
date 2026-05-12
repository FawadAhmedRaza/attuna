import { Eyebrow } from "./Eyebrow";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    title: "Your client journals",
    body: "On a calm app — no streaks, no AI feedback. Just a place to write what's happening between visits.",
    svg: (
      <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
        <rect
          x="20"
          y="14"
          width="40"
          height="52"
          rx="3"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
        />
        <line
          x1="28"
          y1="28"
          x2="52"
          y2="28"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="28"
          y1="36"
          x2="52"
          y2="36"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="28"
          y1="44"
          x2="44"
          y2="44"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="40" cy="56" r="2" fill="var(--warm)" />
      </svg>
    ),
  },
  {
    title: "Attuna reads quietly",
    body: "Patterns surface privately on a HIPAA-compliant pipeline. Nothing leaves your encrypted infrastructure.",
    svg: (
      <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
        <circle cx="40" cy="40" r="20" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <circle
          cx="40"
          cy="40"
          r="12"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <circle cx="40" cy="40" r="3" fill="var(--warm)" />
        <line
          x1="40"
          y1="20"
          x2="40"
          y2="14"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="40"
          y1="60"
          x2="40"
          y2="66"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="40"
          x2="14"
          y2="40"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="60"
          y1="40"
          x2="66"
          y2="40"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "You arrive prepared",
    body: "One brief before each session. What shifted, what repeated, what to ask about first.",
    svg: (
      <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
        <path
          d="M 20 50 Q 30 30, 40 40 T 60 30"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="60" cy="30" r="4" fill="var(--warm)" />
        <line
          x1="20"
          y1="60"
          x2="60"
          y2="60"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.3"
        />
        <line
          x1="20"
          y1="14"
          x2="20"
          y2="60"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
    ),
  },
];

export function HowItWorksSection() {
  return (
    <Reveal>
      <section id="how-it-works" className="bg-bg-soft px-5 py-16 md:px-10 md:py-[100px]">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-16 text-center">
            <div className="mb-4">
              <Eyebrow>How it works</Eyebrow>
            </div>
            <h2
              className="display m-0 font-medium"
              style={{
                fontSize: "clamp(36px, 5vw, 56px)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              Three small, calm pieces.
            </h2>
          </div>

          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}
          >
            {STEPS.map((s) => (
              <div
                key={s.title}
                className="card-warm bg-surface border-border rounded-[20px] border px-8 py-9"
              >
                <div className="mb-6">{s.svg}</div>
                <h3
                  className="display text-ink m-0 mb-3 text-[22px] font-medium"
                  style={{ letterSpacing: "-0.015em" }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-ink-soft tracking-body m-0 text-[15px]"
                  style={{ lineHeight: 1.6 }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

export default HowItWorksSection;
