import { Eyebrow } from "./Eyebrow";
import { Reveal } from "./Reveal";

const FAQ = [
  {
    q: "Is this an AI therapist?",
    a: "No. Attuna does not talk to clients, does not give advice, does not diagnose, and never replaces clinical judgment. Every AI output goes to you for review — clients never see it.",
  },
  {
    q: "How is HIPAA compliance handled?",
    a: "All infrastructure runs on AWS with a signed Business Associate Agreement. AI runs on Amazon Bedrock with zero retention. Data is encrypted with AES-256 at rest and TLS 1.3 in transit.",
  },
  {
    q: "What happens to my clients' data?",
    a: "It stays yours and theirs. We don't train models on it, don't sell it. Clients can delete their data at any time.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from settings in two clicks. No annual commitment unless you choose yearly billing.",
  },
];

export function FAQSection() {
  return (
    <Reveal>
      <section className="bg-bg-soft px-5 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-12 text-center">
            <div className="mb-4">
              <Eyebrow>Common questions</Eyebrow>
            </div>
            <h2
              className="display m-0 font-medium"
              style={{
                fontSize: "clamp(32px, 4.5vw, 44px)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              What therapists ask first.
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="bg-surface border-border rounded-2xl border px-5 py-5 md:px-7 md:py-[22px]"
              >
                <summary
                  className="display text-ink flex cursor-pointer items-center justify-between text-[17px] font-medium"
                  style={{ letterSpacing: "-0.015em" }}
                >
                  {item.q}
                  <span className="faq-icon text-accent text-[22px] font-light">+</span>
                </summary>
                <p
                  className="text-ink-soft tracking-body m-0 mt-3.5 text-[14px]"
                  style={{ lineHeight: 1.65 }}
                >
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

export default FAQSection;
