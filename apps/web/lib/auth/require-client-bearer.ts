// Server-only helper that resolves an Authorization: Bearer <Cognito
// ID token> header into (workspaceId, clientId, clientUserId). The
// only auth path for client journaling — post-M2.3c the mobile app
// is the sole journaling surface and every request carries a real
// Cognito ID token.
//
// Returns null on any failure (token missing, invalid, expired, or
// no linked client_user found); the route handler converts null to
// 401 without leaking which step failed.

import "server-only";

import type { NextRequest } from "next/server";

import { db } from "@attuna/db/client";
import { clientUserRepo } from "@attuna/db/repositories/client-user-repo";

import { CognitoTokenError, verifyCognitoIdToken } from "./verify-cognito-token";

export type VerifiedClientBearer = {
  readonly clientUserId: string;
  readonly clientId: string;
  readonly workspaceId: string;
  readonly cognitoSub: string;
};

export async function requireClientBearer(req: NextRequest): Promise<VerifiedClientBearer | null> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  let claims;
  try {
    claims = await verifyCognitoIdToken(token);
  } catch (err) {
    if (err instanceof CognitoTokenError) return null;
    throw err;
  }

  // Prefer the custom claim if it's set — saves a DB hop after the
  // first /api/c/link. Falls back to a sub lookup the first time the
  // user makes a request, since the claim is only on tokens minted
  // *after* AdminUpdateUserAttributes.
  if (claims.clientUserId) {
    const row = await clientUserRepo.findByIdUnscoped(db(), claims.clientUserId);
    if (!row || row.cognitoSub !== claims.sub) return null;
    return {
      clientUserId: row.id,
      clientId: row.clientId,
      workspaceId: row.workspaceId,
      cognitoSub: claims.sub,
    };
  }

  const row = await clientUserRepo.findByCognitoSubUnscoped(db(), claims.sub);
  if (!row) return null;
  return {
    clientUserId: row.id,
    clientId: row.clientId,
    workspaceId: row.workspaceId,
    cognitoSub: claims.sub,
  };
}
