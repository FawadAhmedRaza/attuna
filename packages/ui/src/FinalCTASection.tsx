import { ArrowRight } from "lucide-react";

import { PillButton } from "./PillButton";
import { Reveal } from "./Reveal";

export function FinalCTASection() {
  return (
    <Reveal>
      <section className="relative overflow-hidden px-5 py-16 text-center md:px-10 md:py-[100px]">
        <svg
          className="pointer-events-none absolute left-[10%] top-[20%] h-[200px] w-[200px] opacity-10"
          viewBox="0 0 200 200"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r="90" fill="none" stroke="var(--accent)" strokeWidth="1" />
          <circle
            cx="100"
            cy="100"
            r="60"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            strokeDasharray="3 6"
          />
        </svg>
        <svg
          className="pointer-events-none absolute right-[10%] top-[30%] h-[150px] w-[150px] opacity-15"
          viewBox="0 0 150 150"
          aria-hidden="true"
        >
          <path
            d="M 30 75 Q 75 30, 120 75 Q 75 120, 30 75"
            fill="none"
            stroke="var(--warm)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        <div className="relative mx-auto max-w-[720px]">
          <h2
            className="display text-ink m-0 mb-5 font-medium"
            style={{
              fontSize: "clamp(36px, 5vw, 60px)",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
            }}
          >
            Walk into your next session
            <br />
            feeling close to the work.
          </h2>
          <p className="text-ink-soft tracking-body mb-9 text-[17px]" style={{ lineHeight: 1.6 }}>
            Try Attuna free for thirty days. No card needed.
          </p>
          <a href="/signup">
            <PillButton variant="primary" size="lg">
              Begin trial <ArrowRight size={16} strokeWidth={1.75} />
            </PillButton>
          </a>
        </div>
      </section>
    </Reveal>
  );
}

export default FinalCTASection;
