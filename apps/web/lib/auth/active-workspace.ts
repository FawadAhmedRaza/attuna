// Last-visited workspace slug, persisted in a signed HTTP-only cookie.
//
// Per ARCHITECTURE.md §4 the active workspace stays OUT of the session JWT —
// removing a member must invalidate access immediately, so the source of
// truth is `workspace_member`, looked up per request. This cookie only
// remembers which workspace to default to when the user lands on a bare
// path like `/` or after sign-in with no `next` param.
//
// Signed (HS256 / jose) with `AUTH_SESSION_SECRET` so a tampered cookie
// can't trick the app into showing a workspace the user isn't a member
// of (membership is checked server-side regardless — this is belt and
// braces).

import "server-only";

import { jwtVerify, SignJWT } from "jose";

const COOKIE_NAME = "atn_ws";
const ALG = "HS256";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

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

export async function signActiveWorkspace(slug: string): Promise<string> {
  return new SignJWT({ slug })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function readActiveWorkspace(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    return typeof payload.slug === "string" ? payload.slug : null;
  } catch {
    return null;
  }
}

export const ACTIVE_WS_COOKIE_NAME = COOKIE_NAME;

export function activeWorkspaceCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_SECONDS,
  };
}
