import { NextResponse, type NextRequest } from "next/server";

import {
  ACTIVE_WS_COOKIE_NAME,
  activeWorkspaceCookieOptions,
  readActiveWorkspace,
  signActiveWorkspace,
} from "@/lib/auth/active-workspace";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const WORKSPACE_SLUG_PATTERN = /^\/w\/([^/]+)(?:\/|$)/;

export async function middleware(req: NextRequest) {
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
  const match = req.nextUrl.pathname.match(WORKSPACE_SLUG_PATTERN);
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
  // Protect onboarding and every workspace-scoped path. The old top-level
  // routes (/today, /clients, etc.) have moved under /w/[slug]/ — middleware
  // no longer matches them so a stale bookmark renders Next's 404.
  matcher: ["/onboarding/:path*", "/w/:slug/:path*"],
};
