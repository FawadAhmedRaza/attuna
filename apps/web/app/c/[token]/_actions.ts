"use server";

import { z } from "zod";

import { db } from "@attuna/db/client";
import { clientInviteRepo } from "@attuna/db/repositories/client-invite-repo";

export type AcceptClientInviteResult =
  | { ok: true; workspaceName?: string }
  | { ok: false; error: string };

const tokenSchema = z.string().min(20).max(120);

// Anonymous accept. Runs signed-out — the token IS the credential.
// `clientInviteRepo.accept` does an idempotent transaction: validates the
// token-hash + expiry + acceptedAt, marks the invite consumed, flips the
// parent client.status to 'active', and writes an anonymous audit row
// with actor_role='client', actor_user_id=null.
//
// No Cognito identity is created here. The mobile app will own that
// flow in M2.3; for now this is just the proof-of-life that the invite
// was redeemed.
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
  return { ok: true };
}
