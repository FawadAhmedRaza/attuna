import type { ReactNode } from "react";

import { Logo } from "./Logo";

type AuthShellProps = {
  children: ReactNode;
  themeToggle: ReactNode;
  wide?: boolean;
};

export function AuthShell({ children, themeToggle, wide = false }: AuthShellProps) {
  return (
    <div className="bg-bg relative min-h-screen overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="pointer-events-none absolute -left-32 -top-40 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
        style={{ background: "color-mix(in oklab, var(--accent) 18%, transparent)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
        style={{ background: "color-mix(in oklab, var(--warm) 22%, transparent)" }}
        aria-hidden="true"
      />

      <header className="relative mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 md:px-10">
        <a href="/" aria-label="Attuna home" className="inline-flex">
          <Logo />
        </a>
        {themeToggle}
      </header>

      <main className="relative flex min-h-[calc(100vh-88px)] items-center justify-center px-5 pb-12 pt-2 md:px-10 md:pb-20">
        <div className={wide ? "w-full max-w-[720px]" : "w-full max-w-[440px]"}>{children}</div>
      </main>
    </div>
  );
}

export default AuthShell;
