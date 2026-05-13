import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { PillButton } from "./PillButton";

type MarketingNavProps = {
  themeToggle: ReactNode;
};

const NAV_ITEMS = [
  { label: "For therapists", href: "#for-therapists" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Stories", href: "#stories" },
];

export function MarketingNav({ themeToggle }: MarketingNavProps) {
  return (
    <header
      className="border-border-soft sticky top-0 z-50 border-b backdrop-blur-md backdrop-saturate-150"
      style={{ background: "color-mix(in oklab, var(--bg) 85%, transparent)" }}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 md:px-10 md:py-5">
        <Logo />
        <nav className="hidden gap-9 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-ink-soft tracking-body hover:text-accent text-[14px] font-medium transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {themeToggle}
          <a
            href="/signin"
            className="text-ink-soft bg-transparent font-sans text-[13px] font-medium"
          >
            Sign in
          </a>
          <a href="/signup">
            <PillButton variant="primary" size="md">
              Begin trial
            </PillButton>
          </a>
        </div>
      </div>
    </header>
  );
}

export default MarketingNav;
