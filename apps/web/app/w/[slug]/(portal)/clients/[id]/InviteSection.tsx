"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Copy, Mail, RefreshCw, Send, Trash2 } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";

import {
  inviteClientToJournalAction,
  type InviteActionResult,
  resendClientInviteAction,
  revokeClientInviteAction,
} from "./_actions";

type PendingInvite = {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
};

type Props = {
  slug: string;
  clientId: string;
  defaultEmail: string | null;
  clientStatus: "invited" | "active" | "paused" | "archived";
  pendingInvite: PendingInvite | null;
};

export function InviteSection({
  slug,
  clientId,
  defaultEmail,
  clientStatus,
  pendingInvite,
}: Props) {
  // The client is already journaling once status flips off "invited" via
  // the accept flow. We still let admins create new invites then (the
  // resume case, e.g. lost mobile + reinstall), but the lead UI is the
  // "accepted" badge rather than a form.
  if (clientStatus === "active") {
    return (
      <section className="bg-surface border-border rounded-2xl border p-6">
        <h2
          className="display text-ink m-0 mb-2 text-[18px] font-medium"
          style={{ letterSpacing: "-0.015em" }}
        >
          Journal access
        </h2>
        <p className="text-ink-soft text-[13px]">
          This client has accepted their invite. They can write entries from the Attuna app.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-surface border-border rounded-2xl border p-6">
      <h2
        className="display text-ink m-0 mb-1 text-[18px] font-medium"
        style={{ letterSpacing: "-0.015em" }}
      >
        Invite to journal
      </h2>
      <p className="text-ink-soft mb-5 text-[13px]">
        Send them a one-time link that opens the Attuna mobile app. Links expire in 7 days.
      </p>

      {pendingInvite ? (
        <PendingView slug={slug} clientId={clientId} invite={pendingInvite} />
      ) : (
        <NewInviteForm slug={slug} clientId={clientId} defaultEmail={defaultEmail} />
      )}
    </section>
  );
}

// ─── New invite form ───────────────────────────────────────────────

function NewInviteForm({
  slug,
  clientId,
  defaultEmail,
}: {
  slug: string;
  clientId: string;
  defaultEmail: string | null;
}) {
  const [state, action] = useFormState<InviteActionResult | null, FormData>(
    inviteClientToJournalAction,
    null,
  );

  return (
    <>
      <form action={action} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="client_id" value={clientId} />
        <Field htmlFor="invite-email" label="Email">
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="off"
            required
            leftIcon={Mail}
            defaultValue={defaultEmail ?? undefined}
            placeholder="client@example.com"
            invalid={state?.ok === false}
          />
        </Field>
        <div className="flex items-end">
          <SubmitButton label="Send invite" pendingLabel="Creating…" icon={Send} />
        </div>
      </form>

      {state?.ok === false ? (
        <p className="text-rose mt-3 text-[13px] font-medium" role="alert">
          {state.error}
        </p>
      ) : null}

      {state?.ok && state.inviteUrl ? (
        <CopyLinkBox url={state.inviteUrl} message={state.message} />
      ) : null}
    </>
  );
}

// ─── Pending invite view ───────────────────────────────────────────

function PendingView({
  slug,
  clientId,
  invite,
}: {
  slug: string;
  clientId: string;
  invite: PendingInvite;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resendUrl, setResendUrl] = useState<string | null>(null);

  function runResend() {
    setError(null);
    setResendUrl(null);
    const form = new FormData();
    form.set("slug", slug);
    form.set("client_id", clientId);
    form.set("invite_id", invite.id);
    startTransition(async () => {
      const res = await resendClientInviteAction(form);
      if (!res.ok) setError(res.error);
      else if (res.inviteUrl) setResendUrl(res.inviteUrl);
    });
  }

  function runRevoke() {
    if (!confirm(`Revoke invite for ${invite.email}?`)) return;
    setError(null);
    const form = new FormData();
    form.set("slug", slug);
    form.set("client_id", clientId);
    form.set("invite_id", invite.id);
    startTransition(async () => {
      const res = await revokeClientInviteAction(form);
      if (!res.ok) setError(res.error);
    });
  }

  const expires = new Date(invite.expiresAt).toLocaleDateString();

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-bg-soft border-border-soft flex flex-col gap-2 rounded-[12px] border px-4 py-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-ink truncate text-[14px] font-semibold">{invite.email}</div>
          <div className="text-ink-mute mt-0.5 text-[12px] font-medium">
            Pending · expires {expires}
          </div>
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
            aria-label={`Revoke invite for ${invite.email}`}
            className="text-ink-mute hover:text-rose rounded-full p-1.5 transition-colors"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {error ? (
        <p className="text-rose text-[12px] font-medium" role="alert">
          {error}
        </p>
      ) : null}
      {resendUrl ? <CopyLinkBox url={resendUrl} message="New link:" /> : null}
    </div>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  icon: Icon,
}: {
  label: string;
  pendingLabel: string;
  icon: typeof Send;
}) {
  const { pending } = useFormStatus();
  return (
    <PillButton type="submit" variant="primary" size="md" disabled={pending} aria-busy={pending}>
      <Icon size={14} strokeWidth={1.75} />
      {pending ? pendingLabel : label}
    </PillButton>
  );
}

function CopyLinkBox({ url, message }: { url: string; message?: string }) {
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
              // Clipboard API unavailable in some browsers/contexts; user
              // can still select the text manually.
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
