import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect onboarding + the authed portal routes (per ARCHITECTURE.md the
  // portal lives at top-level paths, wrapped by the (portal) route group).
  matcher: [
    "/onboarding/:path*",
    "/today/:path*",
    "/clients/:path*",
    "/suggestions/:path*",
    "/templates/:path*",
    "/assistant/:path*",
    "/clinic/:path*",
    "/audit/:path*",
    "/integrations/:path*",
    "/billing/:path*",
    "/roles/:path*",
    "/settings/:path*",
  ],
};
