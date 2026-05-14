import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@attuna/ui/AuthShell";
import { db } from "@attuna/db/client";
import { clientInviteRepo } from "@attuna/db/repositories/client-invite-repo";
import { clientRepo } from "@attuna/db/repositories/client-repo";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";

import { ThemeToggle } from "@/lib/ThemeToggle";

import { AcceptInviteCard } from "./AcceptInviteCard";

export const metadata: Metadata = { title: "You're invited to journal" };

type Props = { params: { token: string } };

export default async function ClientInvitePage({ params }: Props) {
  const invite = await clientInviteRepo.findByToken(db(), params.token);

  if (!invite) {
    return (
      <AuthShell themeToggle={<ThemeToggle />}>
        <InvalidInvite />
      </AuthShell>
    );
  }

  // Fetch supporting context for the welcome card — workspace name and
  // the client's display_name. Both go through unscoped lookups (the
  // visitor is anonymous). workspaceRepo.findByIdUnscoped was added in
  // M2.1 for this kind of pre-context resolution.
  const ws = await workspaceRepo.findByIdUnscoped(db(), invite.workspaceId);
  if (!ws) {
    return (
      <AuthShell themeToggle={<ThemeToggle />}>
        <InvalidInvite />
      </AuthShell>
    );
  }

  // Pull the parent client's display_name through the same channel.
  // RLS would normally guard `client`, but we already know the
  // workspace_id from the invite and the access here is gated by the
  // token itself, so we route through a small admin-tier method.
  const clientName = await clientRepo.findDisplayNameForInvite(
    db(),
    invite.workspaceId,
    invite.clientId,
  );

  return (
    <AuthShell themeToggle={<ThemeToggle />}>
      <AcceptInviteCard
        token={params.token}
        workspaceName={ws.name}
        clientDisplayName={clientName ?? "your client"}
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
