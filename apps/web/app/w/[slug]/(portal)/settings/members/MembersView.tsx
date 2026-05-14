"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Copy, Mail, RefreshCw, Trash2, UserPlus } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";

import {
  changeRoleAction,
  inviteMemberAction,
  leaveWorkspaceAction,
  type MembersActionResult,
  removeMemberAction,
  resendInviteAction,
  revokeInviteAction,
} from "./_actions";

type MemberRow = {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "clinician";
  status: "active" | "invited" | "removed";
  joinedAt: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: "admin" | "clinician";
  expiresAt: string;
  createdAt: string;
};

type Props = {
  slug: string;
  currentUserId: string;
  currentRole: "owner" | "admin" | "clinician";
  members: MemberRow[];
  pending: PendingInvite[];
};

export function MembersView({ slug, currentUserId, currentRole, members, pending }: Props) {
  const isAdmin = currentRole === "owner" || currentRole === "admin";

  return (
    <div className="flex flex-col gap-8">
      {isAdmin ? <InviteForm slug={slug} /> : null}

      <section>
        <h2
          className="display text-ink mb-3 text-[18px] font-medium"
          style={{ letterSpacing: "-0.015em" }}
        >
          Members
          <span className="text-ink-mute ml-2 text-[13px] font-medium">{members.length}</span>
        </h2>
        <div className="bg-surface border-border overflow-hidden rounded-2xl border">
          {members.map((m, i) => (
            <MemberRowView
              key={m.userId}
              row={m}
              slug={slug}
              isAdmin={isAdmin}
              isSelf={m.userId === currentUserId}
              isLast={i === members.length - 1}
              ownerCount={members.filter((x) => x.role === "owner" && x.status === "active").length}
            />
          ))}
        </div>
      </section>

      {isAdmin && pending.length > 0 ? (
        <section>
          <h2
            className="display text-ink mb-3 text-[18px] font-medium"
            style={{ letterSpacing: "-0.015em" }}
          >
            Pending invites
            <span className="text-ink-mute ml-2 text-[13px] font-medium">{pending.length}</span>
          </h2>
          <div className="bg-surface border-border overflow-hidden rounded-2xl border">
            {pending.map((p, i) => (
              <PendingRow key={p.id} invite={p} slug={slug} isLast={i === pending.length - 1} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ─── Invite form ───────────────────────────────────────────────────

function InviteForm({ slug }: { slug: string }) {
  const [state, action] = useFormState<MembersActionResult | null, FormData>(
    inviteMemberAction,
    null,
  );
  return (
    <section className="bg-surface border-border rounded-2xl border p-6">
      <h2
        className="display text-ink mb-1 text-[18px] font-medium"
        style={{ letterSpacing: "-0.015em" }}
      >
        Invite a teammate
      </h2>
      <p className="text-ink-soft mb-5 text-[13px]">
        They&apos;ll get a link to accept. Links expire in 7 days.
      </p>

      <form action={action} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
        <input type="hidden" name="slug" value={slug} />
        <Field htmlFor="invite-email" label="Email">
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="off"
            required
            leftIcon={Mail}
            placeholder="teammate@practice.com"
            invalid={state?.ok === false}
          />
        </Field>
        <Field htmlFor="invite-role" label="Role">
          <select
            id="invite-role"
            name="role"
            defaultValue="clinician"
            className="bg-bg-soft border-border text-ink h-[42px] w-full rounded-[10px] border px-3 text-[13px] font-medium"
          >
            <option value="clinician">Clinician</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <div className="flex items-end">
          <InviteSubmit />
        </div>
      </form>

      {state?.ok === false ? (
        <p className="text-rose mt-3 text-[13px] font-medium" role="alert">
          {state.error}
        </p>
      ) : null}

      {state?.ok && state.inviteUrl ? (
        <InviteLink url={state.inviteUrl} message={state.message} />
      ) : null}
    </section>
  );
}

function InviteSubmit() {
  const { pending } = useFormStatus();
  return (
    <PillButton type="submit" variant="primary" size="md" disabled={pending} aria-busy={pending}>
      <UserPlus size={14} strokeWidth={1.75} />
      {pending ? "Sending…" : "Send invite"}
    </PillButton>
  );
}

function InviteLink({ url, message }: { url: string; message?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-bg-soft border-border-soft mt-4 rounded-[12px] border px-4 py-3">
      <div className="text-ink-mute mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em]">
        {message ?? "Invite created"} — email isn&apos;t wired yet, copy this link:
      </div>
      <div className="flex items-center gap-2">
        <code className="text-ink min-w-0 flex-1 truncate font-mono text-[12px]">{url}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              // Clipboard API unavailable; user can still select the text.
            }
          }}
          className="text-ink-soft hover:text-ink inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium"
        >
          <Copy size={12} strokeWidth={1.75} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ─── Member row ─────────────────────────────────────────────────────

function MemberRowView({
  row,
  slug,
  isAdmin,
  isSelf,
  isLast,
  ownerCount,
}: {
  row: MemberRow;
  slug: string;
  isAdmin: boolean;
  isSelf: boolean;
  isLast: boolean;
  ownerCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initial = row.name.trim().charAt(0).toUpperCase() || "?";
  const canChangeRole = isAdmin && row.role !== "owner" && !isSelf;
  const canRemove = isAdmin && row.role !== "owner" && !isSelf;
  const canLeave = isSelf && !(row.role === "owner" && ownerCount <= 1);

  function runChangeRole(role: string) {
    setError(null);
    const form = new FormData();
    form.set("slug", slug);
    form.set("user_id", row.userId);
    form.set("role", role);
    startTransition(async () => {
      const res = await changeRoleAction(form);
      if (!res.ok) setError(res.error);
    });
  }

  function runRemove() {
    if (!confirm(`Remove ${row.name || row.email}?`)) return;
    setError(null);
    const form = new FormData();
    form.set("slug", slug);
    form.set("user_id", row.userId);
    startTransition(async () => {
      const res = await removeMemberAction(form);
      if (!res.ok) setError(res.error);
    });
  }

  function runLeave() {
    if (!confirm("Leave this workspace? You'll lose access immediately.")) return;
    setError(null);
    const form = new FormData();
    form.set("slug", slug);
    startTransition(async () => {
      const res = await leaveWorkspaceAction(form);
      // Successful leave redirects, so we only see a result on failure.
      if (res && res.ok === false) setError(res.error);
    });
  }

  return (
    <div
      className={[
        "flex items-center gap-4 px-5 py-4",
        isLast ? "" : "border-border-soft border-b",
      ].join(" ")}
    >
      <div className="display bg-accent-bg text-accent flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[14px] font-medium">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-ink truncate text-[14px] font-semibold">
          {row.name}
          {isSelf ? (
            <span className="text-ink-mute ml-1.5 text-[12px] font-medium">· You</span>
          ) : null}
        </div>
        <div className="text-ink-mute truncate text-[12px] font-medium">{row.email}</div>
        {error ? (
          <div className="text-rose mt-1 text-[12px] font-medium" role="alert">
            {error}
          </div>
        ) : null}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {canChangeRole ? (
          <select
            defaultValue={row.role}
            disabled={pending}
            onChange={(e) => runChangeRole(e.target.value)}
            className="bg-bg-soft border-border text-ink rounded-full border px-3 py-1.5 text-[12px] font-medium"
            aria-label={`Change role for ${row.email}`}
          >
            <option value="clinician">Clinician</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <RoleBadge role={row.role} />
        )}
        {canRemove ? (
          <button
            type="button"
            onClick={runRemove}
            disabled={pending}
            aria-label={`Remove ${row.email}`}
            className="text-ink-mute hover:text-rose rounded-full p-1.5 transition-colors"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        ) : null}
        {canLeave ? (
          <button
            type="button"
            onClick={runLeave}
            disabled={pending}
            className="text-ink-soft hover:text-rose rounded-full px-3 py-1.5 text-[12px] font-medium"
          >
            Leave workspace
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: MemberRow["role"] }) {
  const label = role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Clinician";
  return (
    <span className="bg-surface-deep text-ink-soft rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]">
      {label}
    </span>
  );
}

// ─── Pending invite row ─────────────────────────────────────────────

function PendingRow({
  invite,
  slug,
  isLast,
}: {
  invite: PendingInvite;
  slug: string;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resendUrl, setResendUrl] = useState<string | null>(null);

  function runResend() {
    setError(null);
    setResendUrl(null);
    const form = new FormData();
    form.set("slug", slug);
    form.set("invite_id", invite.id);
    startTransition(async () => {
      const res = await resendInviteAction(form);
      if (!res.ok) setError(res.error);
      else if (res.inviteUrl) setResendUrl(res.inviteUrl);
    });
  }

  function runRevoke() {
    if (!confirm(`Revoke invite for ${invite.email}?`)) return;
    setError(null);
    const form = new FormData();
    form.set("slug", slug);
    form.set("invite_id", invite.id);
    startTransition(async () => {
      const res = await revokeInviteAction(form);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div
      className={[
        "flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:gap-4",
        isLast ? "" : "border-border-soft border-b",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="text-ink truncate text-[14px] font-semibold">{invite.email}</div>
        <div className="text-ink-mute mt-0.5 text-[12px] font-medium">
          {invite.role === "admin" ? "Admin" : "Clinician"} · expires{" "}
          {new Date(invite.expiresAt).toLocaleDateString()}
        </div>
        {error ? (
          <div className="text-rose mt-1 text-[12px] font-medium" role="alert">
            {error}
          </div>
        ) : null}
        {resendUrl ? <InviteLink url={resendUrl} message="Resent — new link:" /> : null}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={runResend}
          disabled={pending}
          className="text-ink-soft hover:text-ink border-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium"
        >
          <RefreshCw size={12} strokeWidth={1.75} />
          Resend
        </button>
        <button
          type="button"
          onClick={runRevoke}
          disabled={pending}
          className="text-ink-mute hover:text-rose rounded-full p-1.5 transition-colors"
          aria-label={`Revoke invite for ${invite.email}`}
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
