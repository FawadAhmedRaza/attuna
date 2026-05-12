import { ArrowRight } from "lucide-react";
import { PillButton } from "./PillButton";

export function HeroSection() {
  return (
    <section className="relative mx-auto max-w-[1100px] px-5 pb-12 pt-16 text-center md:px-10 md:pb-20 md:pt-[100px]">
      {/* Decorative SVG flourishes */}
      <svg
        className="pointer-events-none absolute -left-5 top-[100px] h-[140px] w-[140px] opacity-50"
        viewBox="0 0 140 140"
        aria-hidden="true"
      >
        <path
          className="draw-path"
          d="M 30 70 Q 70 30, 110 70 Q 70 110, 30 70"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
      <svg
        className="pointer-events-none absolute right-0 top-[240px] h-[100px] w-[100px] opacity-50"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path
          d="M 15 50 Q 50 15, 85 50"
          fill="none"
          stroke="var(--warm)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 15 60 Q 50 95, 85 60"
          fill="none"
          stroke="var(--warm)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <div
        className="fade d1 bg-warm-bg mb-10 inline-flex items-center gap-2.5 rounded-full px-[18px] py-2"
        style={{ border: "1px solid color-mix(in oklab, var(--warm) 30%, transparent)" }}
      >
        <span className="text-base" aria-hidden="true">
          ✦
        </span>
        <span className="text-warm tracking-body text-[13px] font-semibold">
          A new kind of therapist tool
        </span>
      </div>

      <h1
        className="display fade d2 m-0 mb-8 font-normal"
        style={{
          fontSize: "clamp(56px, 8vw, 96px)",
          lineHeight: 1.0,
          letterSpacing: "-0.025em",
          fontVariationSettings: "'opsz' 72",
        }}
      >
        Stay close to the
        <br />
        <span className="font-semibold">quiet, important</span>
        <br />
        parts of the work.
      </h1>

      <p className="fade d3 text-ink-soft tracking-body mx-auto mb-12 max-w-[580px] text-[19px] font-normal leading-[1.65]">
        Attuna is a calm assistant for therapists. It reads what your clients write between
        sessions, surfaces patterns gently, and helps you arrive prepared — without ever replacing
        your judgment.
      </p>

      <div className="fade d4 mb-6 flex flex-wrap justify-center gap-4">
        <a href="/signup">
          <PillButton variant="primary" size="lg">
            Begin a thirty-day trial <ArrowRight size={16} strokeWidth={1.75} />
          </PillButton>
        </a>
        <PillButton variant="outline" size="lg">
          Watch a 2-min walkthrough
        </PillButton>
      </div>

      <p className="fade d5 text-ink-mute tracking-body text-[13px] font-normal">
        No card needed · HIPAA-compliant · Cancel any time
      </p>
    </section>
  );
}

export default HeroSection;
