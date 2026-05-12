"use client";

import { LogOut } from "lucide-react";

import { Logo } from "@attuna/ui/Logo";

import { signOutAction } from "@/lib/auth/actions";
import { ThemeToggle } from "@/lib/ThemeToggle";

export function PortalMobileBar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="bg-bg-soft border-border flex items-center justify-between border-b px-5 py-3 md:hidden">
      <Logo small />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div
          className="display bg-warm text-ink-on-accent flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium"
          aria-label={name}
        >
          {initial}
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            className="text-ink-soft hover:text-ink rounded-full p-1.5 transition-colors"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </header>
  );
}

export default PortalMobileBar;
