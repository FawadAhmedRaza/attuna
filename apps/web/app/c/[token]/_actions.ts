"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@attuna/db/client";
import { clientInviteRepo } from "@attuna/db/repositories/client-invite-repo";

import {
  CLIENT_SESSION_COOKIE_NAME,
  clientSessionCookieOptions,
  signClientSession,
} from "@/lib/auth/client-session";

export type AcceptClientInviteResult =
  | { ok: true; workspaceName?: string }
  | { ok: false; error: string };

const tokenSchema = z.string().min(20).max(120);

// Anonymous accept. Runs signed-out — the token IS the credential.
// `clientInviteRepo.accept` does an idempotent transaction: validates the
// token-hash + expiry + acceptedAt, marks the invite consumed, flips the
// parent client.status to 'active', provisions a client_user row, and
// writes an anonymous audit row.
//
// On success: sign an `atn_c` cookie carrying (workspace_id, client_id,
// client_user_id) and redirect to /j. M2.3b will replace the cookie
// signing here with a Cognito client-pool sign-in.
export async function acceptClientInviteAction(
  _prev: AcceptClientInviteResult | null,
  formData: FormData,
): Promise<AcceptClientInviteResult> {
  const parsed = tokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) {
    return { ok: false, error: "Invalid invite link." };
  }

  const result = await clientInviteRepo.accept(db(), parsed.data);
  if (!result) {
    return { ok: false, error: "This invitation is no longer valid." };
  }

  const session = await signClientSession({
    clientUserId: result.clientUserId,
    clientId: result.clientId,
    workspaceId: result.workspaceId,
  });
  cookies().set({ ...clientSessionCookieOptions(), value: session });

  // Server-side redirect. redirect() throws NEXT_REDIRECT, which is
  // caught by the action runtime and surfaces as an HTTP 303 — the
  // form submits, the cookie sticks, and the browser lands on /j.
  redirect("/j");
}

// Sign-out for the client web surface — clears the atn_c cookie and
// sends them home. The therapist's separate session (attuna_session)
// is untouched, since the two surfaces never share a user.
export async function signOutClientAction(): Promise<void> {
  cookies().delete(CLIENT_SESSION_COOKIE_NAME);
  redirect("/");
}
