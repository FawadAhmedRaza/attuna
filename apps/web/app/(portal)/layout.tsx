import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

import { PortalSidebar } from "./PortalSidebar";
import { PortalMobileBar } from "./PortalMobileBar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  // Middleware should have already enforced auth on these routes; this is a
  // belt-and-braces guard so layout never renders without a session.
  if (!session) redirect("/signin");

  return (
    <div className="bg-bg flex min-h-screen">
      <PortalSidebar name={session.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalMobileBar name={session.name} />
        <main className="flex-1 overflow-x-hidden px-5 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
