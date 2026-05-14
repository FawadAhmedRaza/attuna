"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";

import { db } from "@attuna/db/client";
import { inviteRepo } from "@attuna/db/repositories/invite-repo";
import { memberRepo } from "@attuna/db/repositories/member-repo";
import { userRepo } from "@attuna/db/repositories/user-repo";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export type AcceptResult = { ok: true } | { ok: false; error: string };

const tokenSchema = z.string().min(20).max(120);

export async function acceptInviteAction(
  _prev: AcceptResult | null,
  formData: FormData,
): Promise<AcceptResult> {
  const parsed = tokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) return { ok: false, error: "Invalid invite link." };
  const token = parsed.data;

  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySessionToken(sessionToken) : null;
  if (!session) {
    // The page should send signed-out users to /signin?next=...; if they
    // somehow POST here without a session, hand back a friendly error.
    return { ok: false, error: "Sign in to accept this invitation." };
  }

  const invite = await inviteRepo.findByToken(db(), token);
  if (!invite) {
    return { ok: false, error: "This invitation is no longer valid." };
  }

  if (invite.email.toLowerCase() !== session.email.toLowerCase()) {
    return {
      ok: false,
      error: `This invite was sent to ${invite.email}. Sign in with that email to accept.`,
    };
  }

  // The DB user row must exist — first sign-in mirrors Cognito subjects
  // into our `user` table via userRepo.upsertFromCognito.
  const user = await userRepo.findById(db(), session.userId);
  if (!user) {
    return {
      ok: false,
      error: "Your account isn't fully set up. Sign out and back in, then retry.",
    };
  }

  // Look up the workspace so we can redirect to its /today after the join.
  const ws = await workspaceRepo.findByIdUnscoped(db(), invite.workspaceId);
  if (!ws) {
    return { ok: false, error: "The workspace for this invite no longer exists." };
  }

  // Join + mark accepted atomically so a partial failure can't leave a
  // ghost membership without consuming the invite (or vice versa).
  await db().transaction(async (tx) => {
    await memberRepo.joinFromInvite(tx, {
      workspaceId: invite.workspaceId,
      userId: user.id,
      role: invite.role,
      invitedBy: invite.invitedBy,
    });
    await inviteRepo.markAccepted(tx, invite.id);
  });

  redirect(`/w/${ws.slug}/today`);
}
