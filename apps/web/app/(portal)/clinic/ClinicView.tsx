"use client";

import { useEffect, useState } from "react";
import { Mail, RefreshCw, UserPlus, X } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";
import { Textarea } from "@attuna/ui/Textarea";

import { useRole } from "@/lib/rbac";

import { PageHeader } from "../_components/PageHeader";

type TherapistRole = "Clinic admin" | "Therapist";

type Therapist = {
  id: string;
  name: string;
  initials: string;
  clients: number;
  briefsThisWeek: number;
  role: TherapistRole;
};

const THERAPISTS: Therapist[] = [
  {
    id: "th_01",
    name: "Dr. Sara Ahmed",
    initials: "SA",
    clients: 24,
    briefsThisWeek: 18,
    role: "Clinic admin",
  },
  {
    id: "th_02",
    name: "Dr. Imran Rashid",
    initials: "IR",
    clients: 19,
    briefsThisWeek: 14,
    role: "Therapist",
  },
  {
    id: "th_03",
    name: "Dr. Fatima Khan",
    initials: "FK",
    clients: 22,
    briefsThisWeek: 16,
    role: "Therapist",
  },
  {
    id: "th_04",
    name: "Dr. Omar Siddiqui",
    initials: "OS",
    clients: 17,
    briefsThisWeek: 11,
    role: "Therapist",
  },
];

type Invitation = {
  id: string;
  name: string;
  email: string;
  role: TherapistRole;
  message: string;
  sentAt: number;
};

const INVITES_KEY = "attuna_invites_v1";

function loadInvites(): Invitation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVITES_KEY);
    return raw ? (JSON.parse(raw) as Invitation[]) : [];
  } catch {
    return [];
  }
}

function saveInvites(list: Invitation[]) {
  try {
    localStorage.setItem(INVITES_KEY, JSON.stringify(list));
  } catch {}
}

function emailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function initialsFromName(name: string) {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .trim()
    .split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ClinicView() {
  const { can } = useRole();
  const canManage = can("manage_therapists");
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setInvites(loadInvites());
  }, []);

  function addInvite(input: Omit<Invitation, "id" | "sentAt">) {
    const next: Invitation = {
      id: `inv_${Date.now()}`,
      sentAt: Date.now(),
      ...input,
    };
    const updated = [next, ...invites];
    setInvites(updated);
    saveInvites(updated);
    setModalOpen(false);
  }

  function revokeInvite(id: string) {
    const updated = invites.filter((i) => i.id !== id);
    setInvites(updated);
    saveInvites(updated);
  }

  function resendInvite(id: string) {
    const updated = invites.map((i) => (i.id === id ? { ...i, sentAt: Date.now() } : i));
    setInvites(updated);
    saveInvites(updated);
  }

  const totalClients = THERAPISTS.reduce((s, t) => s + t.clients, 0);
  const briefsThisWeek = THERAPISTS.reduce((s, t) => s + t.briefsThisWeek, 0);

  const stats = [
    { label: "Therapists", value: String(THERAPISTS.length) },
    { label: "Total clients", value: String(totalClients) },
    { label: "Briefs this week", value: String(briefsThisWeek) },
    { label: "Plan", value: "$399" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="Admin"
        title="Clinic"
        subtitle="Manage therapists in your practice."
        action={
          <PillButton
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            disabled={!canManage}
          >
            <UserPlus size={14} strokeWidth={1.75} />
            Invite therapist
          </PillButton>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface border-border rounded-2xl border px-5 py-5">
            <div className="text-ink-mute mb-2 text-[10px] font-semibold uppercase tracking-[0.06em]">
              {s.label}
            </div>
            <div
              className="display text-ink text-[26px] font-medium leading-none md:text-[28px]"
              style={{ letterSpacing: "-0.025em" }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {invites.length > 0 ? (
        <PendingInvitations
          items={invites}
          canManage={canManage}
          onRevoke={revokeInvite}
          onResend={resendInvite}
        />
      ) : null}

      <div>
        <h3
          className="display text-ink m-0 mb-3 text-[18px] font-medium md:text-[20px]"
          style={{ letterSpacing: "-0.015em" }}
        >
          Therapists
        </h3>
        <div className="bg-surface border-border overflow-hidden rounded-2xl border">
          {THERAPISTS.map((tp, i) => (
            <div
              key={tp.id}
              className={[
                "grid items-center gap-4 px-5 py-5 md:grid-cols-[auto_1fr_auto_auto_auto] md:gap-6 md:px-6",
                i > 0 ? "border-border-soft border-t" : "",
              ].join(" ")}
            >
              <div
                className={[
                  "display flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[14px] font-medium",
                  tp.id === "th_01"
                    ? "bg-accent text-ink-on-accent"
                    : "bg-surface-deep text-ink-soft",
                ].join(" ")}
              >
                {tp.initials}
              </div>

              <div className="min-w-0">
                <div
                  className="display text-ink text-[17px] font-medium md:text-[18px]"
                  style={{ letterSpacing: "-0.015em" }}
                >
                  {tp.name}
                </div>
                <div className="text-ink-mute mt-0.5 font-mono text-[11px]">{tp.id}</div>
              </div>

              <RolePill role={tp.role} />

              <Stat value={tp.clients} label="clients" />
              <Stat value={tp.briefsThisWeek} label="briefs" />
            </div>
          ))}
        </div>
      </div>

      {modalOpen ? <InviteModal onClose={() => setModalOpen(false)} onSend={addInvite} /> : null}
    </div>
  );
}

function PendingInvitations({
  items,
  canManage,
  onRevoke,
  onResend,
}: {
  items: Invitation[];
  canManage: boolean;
  onRevoke: (id: string) => void;
  onResend: (id: string) => void;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h3
          className="display text-ink m-0 text-[18px] font-medium md:text-[20px]"
          style={{ letterSpacing: "-0.015em" }}
        >
          Pending invitations
        </h3>
        <span className="text-ink-mute font-mono text-[11px]">{items.length} sent</span>
      </div>
      <div className="bg-surface border-border overflow-hidden rounded-2xl border">
        {items.map((inv, i) => (
          <div
            key={inv.id}
            className={[
              "grid items-center gap-4 px-5 py-4 md:grid-cols-[auto_1fr_auto_auto_auto] md:gap-6 md:px-6",
              i > 0 ? "border-border-soft border-t" : "",
            ].join(" ")}
          >
            <div className="bg-surface-deep text-ink-soft display flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[14px] font-medium">
              {initialsFromName(inv.name)}
            </div>
            <div className="min-w-0">
              <div
                className="display text-ink text-[16px] font-medium md:text-[17px]"
                style={{ letterSpacing: "-0.015em" }}
              >
                {inv.name}
              </div>
              <div className="text-ink-mute mt-0.5 flex items-center gap-1.5 text-[12px] font-medium">
                <Mail size={11} strokeWidth={1.75} />
                <span className="truncate">{inv.email}</span>
              </div>
            </div>
            <RolePill role={inv.role} />
            <span className="text-ink-mute font-mono text-[11px]">Sent {timeAgo(inv.sentAt)}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onResend(inv.id)}
                disabled={!canManage}
                aria-label="Resend invite"
                title="Resend"
                className="text-ink-mute hover:text-ink rounded-md p-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => onRevoke(inv.id)}
                disabled={!canManage}
                aria-label="Revoke invite"
                title="Revoke"
                className="text-ink-mute hover:text-rose rounded-md p-1.5 transition-colors disabled:opacity-50"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InviteModal({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (input: Omit<Invitation, "id" | "sentAt">) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TherapistRole>("Therapist");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function submit() {
    if (!name.trim()) return setError("Enter the therapist's name.");
    if (!emailValid(email)) return setError("Enter a valid email address.");
    setError(null);
    onSend({ name: name.trim(), email: email.trim(), role, message: message.trim() });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border-border w-full max-w-[480px] rounded-2xl border p-6 shadow-xl md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="invite-title"
              className="display text-ink m-0 text-[22px] font-medium md:text-[24px]"
              style={{ letterSpacing: "-0.015em" }}
            >
              Invite a therapist
            </h2>
            <p
              className="text-ink-mute mt-1 text-[12px] font-medium"
              style={{ letterSpacing: "-0.005em" }}
            >
              They&apos;ll get an email to set their password and join your clinic.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-mute hover:text-ink rounded-md p-1 transition-colors"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Full name" htmlFor="inv-name">
            <Input
              id="inv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Imran Rashid"
              autoComplete="off"
            />
          </Field>

          <Field label="Email" htmlFor="inv-email">
            <Input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="imran@karachitherapy.org"
              autoComplete="off"
            />
          </Field>

          <Field label="Role">
            <div className="flex flex-wrap gap-2">
              {(["Therapist", "Clinic admin"] as TherapistRole[]).map((r) => {
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={[
                      "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-accent text-ink-on-accent border-accent"
                        : "bg-surface border-border text-ink-soft hover:text-ink",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            <p className="text-ink-mute mt-2 text-[11px] font-medium">
              {role === "Clinic admin"
                ? "Manages the practice. No billing access."
                : "Sees their own clients and briefs."}
            </p>
          </Field>

          <Field label="Personal note" htmlFor="inv-message" hint="Optional · sent in the email">
            <Textarea
              id="inv-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Welcome to Karachi Therapy Collective. Glad to have you."
            />
          </Field>

          {error ? (
            <p className="text-rose m-0 text-[13px] font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <PillButton variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </PillButton>
            <PillButton variant="primary" size="sm" onClick={submit}>
              <Mail size={14} strokeWidth={1.75} />
              Send invite
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function RolePill({ role }: { role: TherapistRole }) {
  const isAdmin = role === "Clinic admin";
  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        isAdmin
          ? "bg-accent-bg text-accent border-transparent"
          : "bg-surface-deep text-ink-soft border-transparent",
      ].join(" ")}
    >
      {role}
    </span>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div
        className="display text-ink text-[20px] font-medium md:text-[22px]"
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
      <div className="text-ink-mute mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em]">
        {label}
      </div>
    </div>
  );
}
