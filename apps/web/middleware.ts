import { NextResponse, type NextRequest } from "next/server";

import {
  ACTIVE_WS_COOKIE_NAME,
  activeWorkspaceCookieOptions,
  readActiveWorkspace,
  signActiveWorkspace,
} from "@/lib/auth/active-workspace";
import { CLIENT_SESSION_COOKIE_NAME, verifyClientSession } from "@/lib/auth/client-session";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const WORKSPACE_SLUG_PATTERN = /^\/w\/([^/]+)(?:\/|$)/;
const JOURNAL_PATTERN = /^\/j(?:\/|$)/;

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ── Client journal surface (/j/*) uses a separate cookie (atn_c). ──
  // Therapist sessions are unrelated here. A missing/invalid client
  // session redirects to the home page rather than /signin (which is
  // the therapist sign-in), since the patient's auth lives in the
  // invite flow.
  if (JOURNAL_PATTERN.test(pathname)) {
    const c = await verifyClientSession(req.cookies.get(CLIENT_SESSION_COOKIE_NAME)?.value);
    if (!c) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Therapist surfaces (everything else matched below). ───────────
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Refresh the atn_ws "last visited" cookie on workspace-scoped requests.
  // Membership is NOT checked here — the gate layout does the real auth.
  // We only persist what the user navigated to so /signin and / can default
  // back to it later.
  const match = pathname.match(WORKSPACE_SLUG_PATTERN);
  if (match) {
    const slug = match[1]!;
    const current = await readActiveWorkspace(req.cookies.get(ACTIVE_WS_COOKIE_NAME)?.value);
    if (current !== slug) {
      const res = NextResponse.next();
      const signed = await signActiveWorkspace(slug);
      res.cookies.set({ ...activeWorkspaceCookieOptions(), value: signed });
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  // Protect onboarding, /account, every workspace-scoped path, and the
  // client journal surface /j/*. /c/[token] stays unmatched — the
  // invite token IS the credential for the accept page.
  matcher: ["/account/:path*", "/onboarding/:path*", "/w/:slug/:path*", "/j/:path*"],
};
