// POST /api/c/link — the mobile (M2.3b.3) handshake that:
//   1. Verifies the Cognito ID token (signature + issuer + audience).
//   2. Consumes the invite token + stamps the Cognito sub onto the
//      newly-provisioned client_user row, atomically.
//   3. (Best-effort) Sets `custom:client_user_id` on the Cognito user
//      so subsequent tokens carry the claim and the API can resolve
//      a client_user without a DB round-trip.
//   4. Returns { clientUserId, clientId, workspaceId } so the mobile
//      app can land on /j-equivalent without another round-trip.
//
// Body shape: { inviteToken: string, idToken: string } — both JSON.
// Errors are surfaced as JSON: { error: string }, with appropriate
// HTTP status. Never leak which step failed in detail (a tampered
// invite token vs. an expired Cognito session look the same to the
// caller).

import { type NextRequest, NextResponse } from "next/server";

import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

import { db } from "@attuna/db/client";
import { clientInviteRepo } from "@attuna/db/repositories/client-invite-repo";

import { CognitoTokenError, verifyCognitoIdToken } from "@/lib/auth/verify-cognito-token";

export const runtime = "nodejs";

const region = process.env.AWS_REGION ?? "us-east-1";
const userPoolId = process.env.COGNITO_USER_POOL_ID_CLIENT;
const cognito = new CognitoIdentityProviderClient({ region });

type LinkBody = {
  inviteToken?: unknown;
  idToken?: unknown;
};

export async function POST(req: NextRequest) {
  let body: LinkBody;
  try {
    body = (await req.json()) as LinkBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inviteToken =
    typeof body.inviteToken === "string" && body.inviteToken.length >= 20 ? body.inviteToken : null;
  const idToken = typeof body.idToken === "string" && body.idToken.length > 0 ? body.idToken : null;
  if (!inviteToken || !idToken) {
    return NextResponse.json({ error: "inviteToken and idToken are required" }, { status: 400 });
  }

  // Verify the Cognito ID token first — cheapest reject path for the
  // typical "token expired" case.
  let claims;
  try {
    claims = await verifyCognitoIdToken(idToken);
  } catch (err) {
    if (err instanceof CognitoTokenError) {
      // Don't echo the underlying reason to the caller — same opaque
      // error for every variety of bad token.
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }
    throw err;
  }

  // Consume the invite + stamp cognito_sub atomically.
  const result = await clientInviteRepo.accept(db(), inviteToken, {
    cognitoSub: claims.sub,
  });
  if (!result) {
    // Token already consumed, expired, or unknown. Indistinguishable
    // by design (HIPAA §2 — don't reveal which invites exist).
    return NextResponse.json({ error: "This invitation is no longer valid" }, { status: 410 });
  }

  // Stamp custom:client_user_id on the Cognito user so every token
  // after this one carries the claim. Best-effort: if the AdminUpdate
  // fails (network blip, IAM perms tightening), the link itself is
  // already committed in our DB. Subsequent requests fall back to
  // looking up by cognito_sub.
  if (userPoolId) {
    try {
      await cognito.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: userPoolId,
          Username: claims.sub,
          UserAttributes: [{ Name: "custom:client_user_id", Value: result.clientUserId }],
        }),
      );
    } catch (err) {
      // Log but don't fail the request — the link is durable in our
      // DB regardless. Per HIPAA §7 the log line is structure-only
      // (no PHI); the error message itself can contain Cognito's
      // sanitized failure text.
      // eslint-disable-next-line no-console
      console.warn("[c/link] AdminUpdateUserAttributes failed", {
        reason: (err as Error).message,
        clientUserId: result.clientUserId,
      });
    }
  }

  return NextResponse.json({
    workspaceId: result.workspaceId,
    clientId: result.clientId,
    clientUserId: result.clientUserId,
  });
}
