import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { db } from "@attuna/db/client";
import { clientRepo } from "@attuna/db/repositories/client-repo";

import { resolveActionContext } from "@/lib/workspace/require";

import { PageHeader } from "../_components/PageHeader";

import { NewClientForm } from "./NewClientForm";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ params }: { params: { slug: string } }) {
  const resolved = await resolveActionContext(params.slug);
  if (!resolved.ok) {
    // The parent gate layout already handles missing/forbidden workspaces;
    // a failure here means a stale session.
    redirect(`/signin?next=${encodeURIComponent(`/w/${params.slug}/clients`)}`);
  }
  const { ctx, member } = resolved.value;

  const clients = await clientRepo.list(db(), {
    workspaceId: ctx.workspaceId,
    userId: member.userId,
    role: member.role,
  });

  // Sort newest-first so the just-added client appears at the top after
  // the post-submit revalidate.
  clients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <PageHeader
        eyebrow="Your practice"
        title="Clients"
        subtitle={
          member.role === "clinician"
            ? "Only clients assigned to you are shown here."
            : "Everyone on your team's clients are listed."
        }
      />

      <NewClientForm slug={params.slug} />

      <section className="mt-8">
        <div className="mb-3 flex items-baseline gap-2">
          <h2
            className="display text-ink m-0 text-[18px] font-medium"
            style={{ letterSpacing: "-0.015em" }}
          >
            All clients
          </h2>
          <span className="text-ink-mute text-[13px] font-medium">{clients.length}</span>
        </div>

        {clients.length === 0 ? (
          <div className="bg-surface border-border rounded-2xl border px-6 py-10 text-center">
            <p className="text-ink-soft text-[14px]">No clients yet. Add the first one above.</p>
          </div>
        ) : (
          <ul className="bg-surface border-border m-0 flex list-none flex-col overflow-hidden rounded-2xl border p-0">
            {clients.map((c, i) => (
              <li
                key={c.id}
                className={i < clients.length - 1 ? "border-border-soft border-b" : ""}
              >
                <Link
                  href={`/w/${params.slug}/clients/${c.id}`}
                  className="hover:bg-bg-soft flex items-center gap-4 px-5 py-4 transition-colors md:px-6"
                >
                  <div className="display bg-accent-bg text-accent flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-medium">
                    {(c.displayName.trim().charAt(0) || "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-ink truncate text-[14px] font-semibold"
                      style={{ letterSpacing: "-0.005em" }}
                    >
                      {c.displayName}
                    </div>
                    <div className="text-ink-mute mt-0.5 truncate text-[12px] font-medium">
                      <StatusBadge status={c.status} /> · added {c.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.75}
                    className="text-ink-mute flex-shrink-0"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: "invited" | "active" | "paused" | "archived" }) {
  const label =
    status === "invited"
      ? "Invited"
      : status === "active"
        ? "Active"
        : status === "paused"
          ? "Paused"
          : "Archived";
  return (
    <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.04em]">
      {label}
    </span>
  );
}
