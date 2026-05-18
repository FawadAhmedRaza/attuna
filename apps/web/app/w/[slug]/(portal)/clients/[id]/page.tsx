import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { db } from "@attuna/db/client";
import { clientInviteRepo } from "@attuna/db/repositories/client-invite-repo";
import { clientRepo } from "@attuna/db/repositories/client-repo";
import { entryRepo } from "@attuna/db/repositories/entry-repo";

import { resolveActionContext } from "@/lib/workspace/require";

import { PageHeader } from "../../_components/PageHeader";

import { InviteSection } from "./InviteSection";

export const metadata: Metadata = { title: "Client" };

type Props = { params: { slug: string; id: string } };

export default async function ClientPage({ params }: Props) {
  const resolved = await resolveActionContext(params.slug);
  if (!resolved.ok) {
    redirect(`/signin?next=${encodeURIComponent(`/w/${params.slug}/clients/${params.id}`)}`);
  }
  const { ctx, member } = resolved.value;

  const c = await clientRepo.findById(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId, role: member.role },
    params.id,
  );

  // findById returns null for: client doesn't exist, RLS blocks it, OR
  // clinician-isolation blocks it (clinician viewing another clinician's
  // client). All three look the same to the user — Next's 404.
  if (!c) {
    notFound();
  }

  const auditCtx = { workspaceId: ctx.workspaceId, userId: member.userId, role: member.role };
  const entrySummary = await entryRepo.summaryForClient(db(), auditCtx, c.id);

  const pendingList = await clientInviteRepo.listPendingForClient(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId },
    c.id,
  );
  // listPendingForClient returns invites scoped by client_id within the
  // workspace; we only ever surface the most-recently-created one that
  // hasn't been accepted yet. Resend revokes-then-creates so there's
  // never more than one truly open invite at a time.
  const openInvite = pendingList
    .filter((p) => !p.acceptedAt)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const initial = (c.displayName.trim().charAt(0) || "?").toUpperCase();

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <Link
        href={`/w/${params.slug}/clients`}
        className="text-ink-soft hover:text-ink mb-4 inline-flex items-center gap-1 text-[13px] font-medium"
      >
        <ArrowLeft size={13} strokeWidth={1.75} />
        Back to clients
      </Link>

      <PageHeader
        eyebrow="Client"
        title={c.displayName}
        subtitle={
          c.status === "invited"
            ? "Invited — not yet active."
            : c.status === "active"
              ? "Active."
              : c.status === "paused"
                ? "Paused."
                : "Archived."
        }
      />

      <div className="mb-6">
        <InviteSection
          slug={params.slug}
          clientId={c.id}
          defaultEmail={c.inviteEmail}
          clientStatus={c.status}
          pendingInvite={
            openInvite
              ? {
                  id: openInvite.id,
                  email: openInvite.email,
                  expiresAt: openInvite.expiresAt.toISOString(),
                  createdAt: openInvite.createdAt.toISOString(),
                }
              : null
          }
        />
      </div>

      <section className="bg-surface border-border mb-6 rounded-2xl border p-6">
        <h2
          className="display text-ink m-0 mb-1 text-[18px] font-medium"
          style={{ letterSpacing: "-0.015em" }}
        >
          Journal
        </h2>
        <p className="text-ink-mute mb-5 text-[12px]">
          Entry bodies are end-to-end encrypted — the count and timing are visible to you. The seven
          insight areas land in M3 once the brief generator is wired.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="bg-bg-soft border-border-soft rounded-[12px] border px-4 py-3">
            <div className="text-ink-mute mb-1 text-[11px] font-semibold uppercase tracking-[0.04em]">
              Entries
            </div>
            <div className="display text-ink text-[24px] font-medium leading-none">
              {entrySummary.total}
            </div>
          </div>
          <div className="bg-bg-soft border-border-soft rounded-[12px] border px-4 py-3">
            <div className="text-ink-mute mb-1 text-[11px] font-semibold uppercase tracking-[0.04em]">
              Last entry
            </div>
            <div className="text-ink text-[14px] font-medium">
              {entrySummary.lastWrittenAt
                ? entrySummary.lastWrittenAt.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface border-border rounded-2xl border p-6">
        <h2
          className="display text-ink m-0 mb-1 text-[18px] font-medium"
          style={{ letterSpacing: "-0.015em" }}
        >
          Details
        </h2>
        <p className="text-ink-mute mb-5 text-[12px]">
          Briefs and the seven insight areas land in M3 once the brief generator is wired.
        </p>

        <div className="flex items-center gap-4">
          <div className="display bg-accent-bg text-accent flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-[18px] font-medium">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-ink text-[14px] font-semibold">{c.displayName}</div>
            <div className="text-ink-mute text-[12px] font-medium">
              {c.inviteEmail ?? "No invite email on file"}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Detail label="Status" value={c.status} />
          <Detail
            label="Assigned clinician"
            value={c.assignedClinicianId === member.userId ? "You" : (c.assignedClinicianId ?? "—")}
          />
          <Detail label="Added" value={c.createdAt.toLocaleDateString()} />
          <Detail label="Client ID" value={c.id} mono />
        </dl>
      </section>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-bg-soft border-border-soft rounded-[12px] border px-4 py-3">
      <dt className="text-ink-mute mb-1 text-[11px] font-semibold uppercase tracking-[0.04em]">
        {label}
      </dt>
      <dd
        className={[
          "text-ink m-0 truncate text-[14px] font-medium",
          mono ? "font-mono text-[12px]" : "",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
