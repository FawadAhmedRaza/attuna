import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@attuna/ui/AuthShell";
import { db } from "@attuna/db/client";
import { clientInviteRepo } from "@attuna/db/repositories/client-invite-repo";
import { clientRepo } from "@attuna/db/repositories/client-repo";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";

import { ThemeToggle } from "@/lib/ThemeToggle";

import { InstallAppCard } from "./InstallAppCard";

export const metadata: Metadata = { title: "You're invited to journal" };

type Props = { params: { token: string } };

// `/c/[token]` is the human-readable invite landing. The invite is
// consumed by the mobile app via /api/c/link (M2.3b.3) — not here.
// This page:
//   • Confirms the invite is still valid (so a stale link gives a
//     friendly error rather than dumping an install CTA that won't
//     work once the user installs).
//   • Tells the invitee what to do: install the Attuna app, open
//     the same link on their phone.
//
// The token NEVER leaves the URL — server-side rendering avoids
// dropping it into client state, and the page contains no form that
// posts it anywhere. The mobile app re-receives the token through
// the deep link, not through anything this page emits.

export default async function ClientInvitePage({ params }: Props) {
  const invite = await clientInviteRepo.findByToken(db(), params.token);

  if (!invite) {
    return (
      <AuthShell themeToggle={<ThemeToggle />}>
        <InvalidInvite />
      </AuthShell>
    );
  }

  const ws = await workspaceRepo.findByIdUnscoped(db(), invite.workspaceId);
  if (!ws) {
    return (
      <AuthShell themeToggle={<ThemeToggle />}>
        <InvalidInvite />
      </AuthShell>
    );
  }

  const clientName = await clientRepo.findDisplayNameForInvite(
    db(),
    invite.workspaceId,
    invite.clientId,
  );

  return (
    <AuthShell themeToggle={<ThemeToggle />}>
      <InstallAppCard
        token={params.token}
        workspaceName={ws.name}
        clientDisplayName={clientName ?? "you"}
        invitedEmail={invite.email}
      />
    </AuthShell>
  );
}

function InvalidInvite() {
  return (
    <div className="bg-surface border-border rounded-[20px] border p-8 text-center md:p-10">
      <h1
        className="display text-ink m-0 text-[28px] font-medium"
        style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
      >
        This invitation is no longer valid.
      </h1>
      <p
        className="text-ink-soft tracking-body mx-auto mt-3 max-w-[360px] text-[14px]"
        style={{ lineHeight: 1.55 }}
      >
        Invites expire after 7 days and can only be used once. Ask your therapist to send you a
        fresh link.
      </p>
      <div className="mt-7 flex justify-center">
        <Link
          href="/"
          className="bg-accent text-ink-on-accent ease-attuna inline-flex items-center justify-center gap-2 rounded-full px-[22px] py-[13px] text-[14px] font-semibold transition-all duration-200"
        >
          Back to Attuna
        </Link>
      </div>
    </div>
  );
}
