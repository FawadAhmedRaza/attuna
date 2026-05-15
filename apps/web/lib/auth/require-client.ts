// Server-only helper that resolves the `atn_c` client session cookie
// into a verified (workspaceId, clientId, clientUserId) tuple, or
// returns null. The /j page + write-entry action both go through this
// so the cookie payload is verified in exactly one place.
//
// In addition to JWT signature verification, this re-checks that the
// client_user row still exists and that its workspace_id + client_id
// match what the cookie claims. A forged cookie that survived signing
// would have to fabricate both the JWT signature AND a matching row
// in the DB; the row check catches the latter.

import "server-only";

import { cookies } from "next/headers";

import { db } from "@attuna/db/client";
import { clientUserRepo } from "@attuna/db/repositories/client-user-repo";

import {
  CLIENT_SESSION_COOKIE_NAME,
  type ClientSession,
  verifyClientSession,
} from "./client-session";

export type VerifiedClient = {
  readonly clientUserId: string;
  readonly clientId: string;
  readonly workspaceId: string;
};

export async function requireClientSession(): Promise<VerifiedClient | null> {
  const token = cookies().get(CLIENT_SESSION_COOKIE_NAME)?.value;
  const session: ClientSession | null = await verifyClientSession(token);
  if (!session) return null;

  // Cross-check the cookie's claims against the DB. A row that no
  // longer exists (client deleted by therapist, workspace deleted)
  // invalidates the session.
  const row = await clientUserRepo.findByIdUnscoped(db(), session.clientUserId);
  if (!row) return null;
  if (row.workspaceId !== session.workspaceId) return null;
  if (row.clientId !== session.clientId) return null;

  return {
    clientUserId: row.id,
    clientId: row.clientId,
    workspaceId: row.workspaceId,
  };
}
