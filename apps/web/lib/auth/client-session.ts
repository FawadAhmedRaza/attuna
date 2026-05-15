// Client-side session cookie for the patient (not the therapist).
//
// **M2.3a TEMPORARY.** This cookie carries (workspace_id, client_id,
// client_user_id) directly — the token from /c/[token] accept IS the
// credential, and we trust the cookie because it's signed with
// AUTH_SESSION_SECRET. In M2.3b the Cognito client pool will own the
// authentication, this cookie becomes a thin wrapper around a real
// Cognito session, and the no-Cognito fail-closed below can be
// removed.
//
// Until then, this path is impossible to ship to production:
// `signClientSession` throws in NODE_ENV=production unless the env var
// `ENABLE_DEV_CLIENT_SESSION=1` is explicitly set (which we never set
// in prod). Same fail-closed pattern as the dev KMS shim.

import "server-only";

import { jwtVerify, SignJWT } from "jose";

const COOKIE_NAME = "atn_c";
const ALG = "HS256";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days — clients write infrequently.

export type ClientSession = {
  /** Our client_user.id — the auth identity for this patient. */
  clientUserId: string;
  /** The client_id this client_user is bound to. Denormalized into the
   *  cookie so /j/* requests don't need a DB round-trip to know which
   *  client they're writing for. */
  clientId: string;
  /** The workspace the client belongs to. */
  workspaceId: string;
  exp: number;
};

function devForbidsProd(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.ENABLE_DEV_CLIENT_SESSION === "1") return;
  throw new Error(
    "atn_c (dev client session) is M2.3a-only. M2.3b wires Cognito client pool; until then this cookie cannot be used in production.",
  );
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SESSION_SECRET must be set in production");
    }
    return new TextEncoder().encode("dev-only-fallback-secret-change-me-at-least-32b");
  }
  return new TextEncoder().encode(secret);
}

export async function signClientSession(input: Omit<ClientSession, "exp">): Promise<string> {
  devForbidsProd();
  return new SignJWT({
    clientUserId: input.clientUserId,
    clientId: input.clientId,
    workspaceId: input.workspaceId,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyClientSession(
  token: string | undefined,
): Promise<ClientSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    if (
      typeof payload.clientUserId !== "string" ||
      typeof payload.clientId !== "string" ||
      typeof payload.workspaceId !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    return {
      clientUserId: payload.clientUserId,
      clientId: payload.clientId,
      workspaceId: payload.workspaceId,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export const CLIENT_SESSION_COOKIE_NAME = COOKIE_NAME;

export function clientSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_SECONDS,
  };
}
