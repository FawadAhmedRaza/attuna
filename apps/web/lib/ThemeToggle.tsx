"use client";

import { useTheme } from "@/lib/use-theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      className="border-border text-ink-soft tracking-body hover:text-ink rounded-full border bg-transparent px-3.5 py-[7px] font-sans text-[12px] font-medium transition-colors"
    >
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}

export default ThemeToggle;
