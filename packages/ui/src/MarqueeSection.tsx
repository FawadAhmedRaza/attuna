const PRACTICES = [
  "Karachi Therapy Co.",
  "Mindful Manhattan",
  "Northbrook Clinical",
  "Dubai Wellness Group",
  "Oakwood Psychiatry",
  "Bridgeport Counseling",
  "Cascade Therapy",
  "Meridian Psych Assoc.",
];

export function MarqueeSection() {
  return (
    <section className="overflow-hidden pb-[100px] pt-5">
      <p className="text-ink-mute mb-6 text-center text-[12px] font-semibold uppercase tracking-[0.06em]">
        ✦ Built with feedback from 80+ therapists across 12 countries ✦
      </p>
      <div
        className="overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div className="marquee flex w-fit gap-16 whitespace-nowrap">
          {[0, 1].flatMap((set) =>
            PRACTICES.map((name, i) => (
              <div
                key={`${set}-${i}`}
                className="display text-ink-mute text-[18px] font-medium italic opacity-60"
                style={{ letterSpacing: "-0.015em" }}
              >
                {name}
              </div>
            )),
          )}
        </div>
      </div>
    </section>
  );
}

export default MarqueeSection;
