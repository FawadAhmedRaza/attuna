import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findWorkspaceBySlug, getWorkspacesForUser } from "@/lib/workspace/resolve";

// Workspace gate. Resolves /w/[slug]/... → (workspace, membership). Three
// outcomes:
//
//   • slug not found in DB           → notFound() (Next.js 404)
//   • slug found, user not a member  → render NoAccess (hard 403 per the
//                                       decision recorded in ROADMAP M1 step 4)
//   • slug found, user is active    → render children; the nested (portal)
//                                       layout fetches the same data via the
//                                       React cache helper so it isn't queried
//                                       twice in one request
//
// The atn_ws cookie is refreshed by middleware on every /w/<slug>/... visit,
// not here — server components can't write cookies in Next 14.

export default async function WorkspaceGateLayout({
  params,
  children,
}: {
  params: { slug: string };
  children: React.ReactNode;
}) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    redirect(`/signin?next=${encodeURIComponent(`/w/${params.slug}/today`)}`);
  }

  const userWorkspaces = await getWorkspacesForUser(session.userId);
  const active = userWorkspaces.find((w) => w.slug === params.slug);
  if (active) {
    return <>{children}</>;
  }

  const exists = await findWorkspaceBySlug(params.slug);
  if (!exists) {
    notFound();
  }

  return <NoAccess slug={params.slug} userWorkspaces={userWorkspaces} />;
}

function NoAccess({
  slug,
  userWorkspaces,
}: {
  slug: string;
  userWorkspaces: Awaited<ReturnType<typeof getWorkspacesForUser>>;
}) {
  const fallback = userWorkspaces[0];
  return (
    <div className="bg-bg flex min-h-screen items-center justify-center px-6">
      <div className="bg-surface border-border w-full max-w-md rounded-[20px] border p-8 text-center">
        <h1
          className="display text-ink m-0 text-[28px] font-medium"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
        >
          You don&apos;t have access to this workspace.
        </h1>
        <p
          className="text-ink-soft tracking-body mx-auto mt-3 max-w-[320px] text-[14px]"
          style={{ lineHeight: 1.55 }}
        >
          The workspace <span className="text-ink font-medium">{slug}</span> exists, but you&apos;re
          not a member.
        </p>
        <div className="mt-7 flex flex-col items-center gap-2">
          <Link
            href={fallback ? `/w/${fallback.slug}/today` : "/onboarding"}
            className="bg-accent text-ink-on-accent ease-attuna inline-flex items-center justify-center gap-2 rounded-full border border-transparent px-[22px] py-[13px] text-[14px] font-semibold transition-all duration-200"
          >
            {fallback ? `Go to ${fallback.name}` : "Create your workspace"}
          </Link>
        </div>
      </div>
    </div>
  );
}
