import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getWorkspacesForUser } from "@/lib/workspace/resolve";

import { PortalSidebar } from "./PortalSidebar";
import { PortalMobileBar } from "./PortalMobileBar";

// The parent gate (`app/w/[slug]/layout.tsx`) has already verified the
// session and active membership for `params.slug`. This layout just
// renders the portal chrome and feeds the sidebar the workspaces list +
// active slug for the switcher. `getWorkspacesForUser` is React-cached so
// the gate's earlier call is reused — no second DB hit.

export default async function PortalLayout({
  params,
  children,
}: {
  params: { slug: string };
  children: React.ReactNode;
}) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) redirect("/signin");

  const workspaces = await getWorkspacesForUser(session.userId);

  return (
    <div className="bg-bg flex min-h-screen">
      <PortalSidebar
        name={session.name}
        activeSlug={params.slug}
        workspaces={workspaces.map((w) => ({ slug: w.slug, name: w.name }))}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalMobileBar name={session.name} />
        <main className="flex-1 overflow-x-hidden px-5 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
