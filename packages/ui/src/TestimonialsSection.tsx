import { Eyebrow } from "./Eyebrow";
import { Reveal } from "./Reveal";

const TESTIMONIALS = [
  {
    quote:
      "I walk into sessions with context I would have spent the first ten minutes asking about. It's changed the texture of my work.",
    name: "Dr. Lila Hassan",
    role: "Clinical Psychologist · Lahore",
  },
  {
    quote:
      "The contradictions feature caught something I had missed for weeks. A client tagging 'calm' while describing rumination — that pattern became a turning point.",
    name: "Dr. Ben Marchetti",
    role: "Psychotherapist · Brooklyn",
  },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

export function TestimonialsSection() {
  return (
    <Reveal>
      <section id="stories" className="bg-bg-soft px-5 py-16 md:px-10 md:py-[100px]">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-12 text-center md:mb-14">
            <div className="mb-4">
              <Eyebrow>From the early beta</Eyebrow>
            </div>
            <h2
              className="display m-0 font-medium"
              style={{
                fontSize: "clamp(32px, 4.5vw, 48px)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              What therapists are saying.
            </h2>
          </div>

          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))" }}
          >
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="card-warm bg-surface border-border rounded-[20px] border px-7 py-8 md:px-10 md:py-9"
              >
                <div className="text-warm mb-3.5 text-[32px] leading-[0.5]" aria-hidden="true">
                  &ldquo;
                </div>
                <p
                  className="display-md text-ink m-0 mb-6 text-[18px] font-normal"
                  style={{ lineHeight: 1.55, letterSpacing: "-0.012em" }}
                >
                  {t.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="display bg-accent-bg text-accent flex h-10 w-10 items-center justify-center rounded-full text-base font-medium">
                    {initials(t.name)}
                  </div>
                  <div>
                    <div
                      className="display text-ink text-[14px] font-medium"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      {t.name}
                    </div>
                    <div className="text-ink-mute text-[11px] font-medium">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

export default TestimonialsSection;
