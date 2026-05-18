import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LogOut, Plus } from "lucide-react";

import { AuthShell } from "@attuna/ui/AuthShell";
import { Eyebrow } from "@attuna/ui/Eyebrow";
import { db } from "@attuna/db/client";
import { memberRepo } from "@attuna/db/repositories/member-repo";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";

import { signOutAction } from "@/lib/auth/actions";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { ThemeToggle } from "@/lib/ThemeToggle";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  // Middleware already enforces session for /account/:path*; this is the
  // belt-and-braces check that lets us narrow `session` for the page.
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) redirect("/signin?next=/account");

  const workspaces = await workspaceRepo.listForUser(db(), session.userId);

  // Fetch role per workspace in parallel. listForUser only returns the
  // workspace row (no membership detail), so we look up the caller's
  // member row in each. Tiny N — fine for now; if it grows, add a single
  // joined query to memberRepo.
  const roles = await Promise.all(
    workspaces.map((w) =>
      memberRepo.findOne(db(), { workspaceId: w.id, userId: session.userId }, session.userId),
    ),
  );

  return (
    <AuthShell themeToggle={<ThemeToggle />} wide>
      <div className="flex flex-col gap-6">
        <header className="text-center">
          <Eyebrow flanked={false}>Your account</Eyebrow>
          <h1
            className="display text-ink mt-3 text-[32px] font-medium md:text-[36px]"
            style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            {session.name}
          </h1>
          <p className="text-ink-mute mt-1.5 text-[13px] font-medium">{session.email}</p>
        </header>

        <section className="bg-surface border-border rounded-[20px] border p-6 md:p-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2
              className="display text-ink m-0 text-[18px] font-medium"
              style={{ letterSpacing: "-0.015em" }}
            >
              Workspaces
              <span className="text-ink-mute ml-2 text-[13px] font-medium">
                {workspaces.length}
              </span>
            </h2>
            <Link
              href="/onboarding"
              className="text-accent hover:text-accent-deep inline-flex items-center gap-1 text-[13px] font-semibold"
            >
              <Plus size={12} strokeWidth={2} />
              New workspace
            </Link>
          </div>

          {workspaces.length === 0 ? (
            <div className="bg-bg-soft border-border-soft flex flex-col items-center gap-3 rounded-[14px] border px-5 py-8 text-center">
              <p className="text-ink-soft text-[14px]">You&apos;re not in any workspaces yet.</p>
              <Link
                href="/onboarding"
                className="bg-accent text-ink-on-accent ease-attuna inline-flex items-center justify-center gap-2 rounded-full px-[22px] py-[13px] text-[14px] font-semibold transition-all duration-200"
              >
                Create your first workspace
              </Link>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {workspaces.map((w, i) => {
                const role = roles[i];
                return (
                  <li key={w.id}>
                    <Link
                      href={`/w/${w.slug}/today`}
                      className="bg-bg-soft border-border-soft hover:border-accent flex items-center gap-4 rounded-[14px] border px-4 py-3.5 transition-colors"
                    >
                      <div className="display bg-accent-bg text-accent flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-medium">
                        {w.name.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-ink truncate text-[14px] font-semibold"
                          style={{ letterSpacing: "-0.005em" }}
                        >
                          {w.name}
                        </div>
                        <div className="text-ink-mute truncate text-[12px] font-medium">
                          /w/{w.slug}
                          {role ? <span> · {roleLabel(role.role)}</span> : null}
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        strokeWidth={1.75}
                        className="text-ink-mute flex-shrink-0"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-surface border-border rounded-[20px] border p-6 md:p-8">
          <h2
            className="display text-ink m-0 mb-1 text-[18px] font-medium"
            style={{ letterSpacing: "-0.015em" }}
          >
            Profile
          </h2>
          <p className="text-ink-mute mb-5 text-[12px]">
            Name and email come from your sign-in. Change them in account security (soon).
          </p>
          <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Detail label="Name" value={session.name} />
            <Detail label="Email" value={session.email} />
          </dl>
        </section>

        <form action={signOutAction} className="flex justify-center">
          <button
            type="submit"
            className="text-ink-soft hover:text-rose inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
          >
            <LogOut size={14} strokeWidth={1.75} />
            Sign out
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-soft border-border-soft rounded-[12px] border px-4 py-3">
      <dt className="text-ink-mute mb-1 text-[11px] font-semibold uppercase tracking-[0.04em]">
        {label}
      </dt>
      <dd className="text-ink m-0 truncate text-[14px] font-medium">{value}</dd>
    </div>
  );
}

function roleLabel(role: "owner" | "admin" | "clinician"): string {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Clinician";
}
