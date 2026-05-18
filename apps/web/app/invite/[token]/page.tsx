import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { AuthShell } from "@attuna/ui/AuthShell";
import { db } from "@attuna/db/client";
import { inviteRepo } from "@attuna/db/repositories/invite-repo";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { ThemeToggle } from "@/lib/ThemeToggle";

import { AcceptInviteForm } from "./AcceptInviteForm";

export const metadata: Metadata = { title: "You're invited" };

type Props = { params: { token: string } };

export default async function AcceptInvitePage({ params }: Props) {
  const invite = await inviteRepo.findByToken(db(), params.token);

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

  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const emailMatches = session && session.email.toLowerCase() === invite.email.toLowerCase();

  return (
    <AuthShell themeToggle={<ThemeToggle />}>
      <div className="bg-surface border-border rounded-[20px] border p-8 md:p-10">
        <div className="mb-5 text-center">
          <div className="text-ink-mute text-[11px] font-semibold uppercase tracking-[0.06em]">
            You&apos;re invited
          </div>
          <h1
            className="display text-ink mt-3 text-[28px] font-medium md:text-[32px]"
            style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            Join {ws.name}
          </h1>
          <p
            className="text-ink-soft tracking-body mx-auto mt-3 max-w-[360px] text-[14px]"
            style={{ lineHeight: 1.55 }}
          >
            <span className="text-ink font-medium">{invite.email}</span> was invited as{" "}
            <span className="text-ink font-medium">
              {invite.role === "admin" ? "an admin" : "a clinician"}
            </span>
            .
          </p>
        </div>

        {emailMatches ? (
          <AcceptInviteForm token={params.token} />
        ) : session ? (
          <WrongEmail invitedEmail={invite.email} signedInEmail={session.email} />
        ) : (
          <SignedOutCTA token={params.token} />
        )}
      </div>
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
        Invites expire after 7 days and can only be used once. Ask whoever sent it to send a fresh
        link.
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

function WrongEmail({
  invitedEmail,
  signedInEmail,
}: {
  invitedEmail: string;
  signedInEmail: string;
}) {
  return (
    <div className="text-center">
      <p className="text-ink-soft mb-5 text-[13px] font-medium">
        You&apos;re signed in as <span className="text-ink font-semibold">{signedInEmail}</span>,
        but this invite was sent to <span className="text-ink font-semibold">{invitedEmail}</span>.
      </p>
      <p className="text-ink-mute mb-6 text-[12px]">
        Sign out and back in with that address to accept.
      </p>
      <Link href="/" className="text-accent hover:text-accent-deep text-[13px] font-semibold">
        Back to Attuna →
      </Link>
    </div>
  );
}

function SignedOutCTA({ token }: { token: string }) {
  const next = encodeURIComponent(`/invite/${token}`);
  return (
    <div className="flex flex-col gap-3">
      <Link
        href={`/signin?next=${next}`}
        className="bg-accent text-ink-on-accent ease-attuna inline-flex items-center justify-center gap-2 rounded-full px-[22px] py-[13px] text-[14px] font-semibold transition-all duration-200"
      >
        Sign in to accept
      </Link>
      <Link
        href={`/signup?next=${next}`}
        className="text-ink border-border hover:bg-bg-soft inline-flex items-center justify-center gap-2 rounded-full border px-[22px] py-[13px] text-[14px] font-medium"
      >
        Sign up
      </Link>
      <p className="text-ink-mute mt-2 text-center text-[12px]">
        Use the same email this invite was sent to.
      </p>
    </div>
  );
}
