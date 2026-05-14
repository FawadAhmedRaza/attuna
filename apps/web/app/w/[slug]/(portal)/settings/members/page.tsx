import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { db } from "@attuna/db/client";
import { inviteRepo } from "@attuna/db/repositories/invite-repo";
import { memberRepo } from "@attuna/db/repositories/member-repo";

import { resolveActionContext } from "@/lib/workspace/require";

import { PageHeader } from "../../_components/PageHeader";

import { MembersView } from "./MembersView";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params }: { params: { slug: string } }) {
  // Anyone in the workspace can view the members list. Admin-only actions
  // (invite, remove, change role) are gated in the action layer, not here —
  // a clinician viewing the page sees a read-only roster.
  const resolved = await resolveActionContext(params.slug);
  if (!resolved.ok) {
    // The parent gate layout already 404s/forbids on bad slug or non-member,
    // so this branch only fires for a stale session — bounce to /signin.
    redirect(`/signin?next=${encodeURIComponent(`/w/${params.slug}/settings/members`)}`);
  }
  const { ctx, member, workspace } = resolved.value;

  const isAdmin = member.role === "owner" || member.role === "admin";

  const [members, pending] = await Promise.all([
    memberRepo.listWithUser(db(), ctx),
    isAdmin ? inviteRepo.listPending(db(), ctx) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <PageHeader
        eyebrow={workspace.name}
        title="Members"
        subtitle="Invite teammates, manage roles. Removing a member keeps their audit trail intact."
      />

      <MembersView
        slug={params.slug}
        currentUserId={member.userId}
        currentRole={member.role}
        members={members.map((m) => ({
          userId: m.userId,
          email: m.email,
          name: m.name,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt ? m.joinedAt.toISOString() : null,
        }))}
        pending={pending.map((p) => ({
          id: p.id,
          email: p.email,
          role: p.role,
          expiresAt: p.expiresAt.toISOString(),
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
