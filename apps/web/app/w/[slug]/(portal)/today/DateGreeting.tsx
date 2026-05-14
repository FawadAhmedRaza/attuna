"use client";

import { useEffect, useState } from "react";

function partOfDay(hour: number): string {
  if (hour < 5) return "Hello";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DateGreeting({ name }: { name: string }) {
  const [date, setDate] = useState<string | null>(null);
  const [salutation, setSalutation] = useState<string>("Welcome");

  useEffect(() => {
    const now = new Date();
    setDate(
      now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
    setSalutation(partOfDay(now.getHours()));
  }, []);

  return (
    <>
      <div
        className="text-ink-mute mb-3 text-[12px] font-medium"
        // Avoid layout shift between server (empty) and client hydration.
        style={{ minHeight: 18 }}
      >
        {date}
      </div>
      <h1
        className="display text-ink m-0 mb-4 text-[36px] font-medium md:text-[48px]"
        style={{ letterSpacing: "-0.025em", lineHeight: 1.05 }}
      >
        {salutation}, {name}.
      </h1>
    </>
  );
}

export default DateGreeting;
