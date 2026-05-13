"use client";

import { Check, Minus } from "lucide-react";

import { PillButton } from "@attuna/ui/PillButton";

import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  permissionsFor,
  useRole,
  type Permission,
  type Role,
} from "@/lib/rbac";

import { PageHeader } from "../_components/PageHeader";

const TEAM = [
  { id: "th_01", name: "Dr. Sara Ahmed", initials: "SA", role: "owner" as Role, you: true },
  {
    id: "th_02",
    name: "Dr. Imran Rashid",
    initials: "IR",
    role: "clinic_admin" as Role,
    you: false,
  },
  { id: "th_03", name: "Dr. Fatima Khan", initials: "FK", role: "therapist" as Role, you: false },
  { id: "th_04", name: "Dr. Omar Siddiqui", initials: "OS", role: "therapist" as Role, you: false },
];

export default function RolesPage() {
  const { role, setRole, can } = useRole();
  const canManage = can("manage_roles");

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PageHeader
        eyebrow="Admin"
        title="Roles & permissions"
        subtitle="Who can do what across your practice."
        action={
          canManage ? (
            <PillButton variant="primary" size="sm">
              Invite teammate
            </PillButton>
          ) : null
        }
      />

      <RolePreview role={role} setRole={setRole} canManage={canManage} />
      <PermissionsMatrix />
      <TeamTable currentRole={role} canManage={canManage} />
    </div>
  );
}

function RolePreview({
  role,
  setRole,
  canManage,
}: {
  role: Role;
  setRole: (r: Role) => void;
  canManage: boolean;
}) {
  return (
    <div className="bg-surface border-border mb-6 rounded-2xl border p-6 md:p-7">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3
          className="display text-ink m-0 text-[18px] font-medium md:text-[20px]"
          style={{ letterSpacing: "-0.015em" }}
        >
          Preview as
        </h3>
        <span className="text-ink-mute text-[11px] font-medium italic">
          Switches your view of the portal — no data changes.
        </span>
      </div>
      <p
        className="text-ink-soft mb-4 text-[13px] font-medium"
        style={{ letterSpacing: "-0.005em" }}
      >
        {ROLE_DESCRIPTIONS[role]}
      </p>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => {
          const active = r === role;
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
              {ROLE_LABELS[r]}
            </button>
          );
        })}
      </div>
      {!canManage ? (
        <p className="text-ink-mute mt-3 text-[12px] font-medium italic">
          Only owners can change role assignments. You can preview, not edit.
        </p>
      ) : null}
    </div>
  );
}

function PermissionsMatrix() {
  return (
    <section className="mb-6">
      <h3
        className="display text-ink m-0 mb-3 text-[18px] font-medium md:text-[20px]"
        style={{ letterSpacing: "-0.015em" }}
      >
        Permissions
      </h3>

      <div className="bg-surface border-border overflow-hidden rounded-2xl border">
        <div className="bg-bg-soft border-border-soft hidden grid-cols-[1.6fr_repeat(3,1fr)] items-center gap-3 border-b px-6 py-3 md:grid">
          <div className="text-ink-mute text-[10px] font-semibold uppercase tracking-[0.06em]">
            Permission
          </div>
          {ROLES.map((r) => (
            <div
              key={r}
              className="text-ink-mute text-center text-[10px] font-semibold uppercase tracking-[0.06em]"
            >
              {ROLE_LABELS[r]}
            </div>
          ))}
        </div>

        {PERMISSION_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="bg-bg-soft border-border-soft display text-ink-soft border-b px-6 py-2 text-[12px] font-semibold uppercase tracking-[0.05em]">
              {group.label}
            </div>
            {group.permissions.map((p, i) => (
              <PermissionRow key={p} permission={p} striped={i % 2 === 1} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function PermissionRow({ permission, striped }: { permission: Permission; striped: boolean }) {
  return (
    <div
      className={[
        "border-border-soft grid grid-cols-1 items-center gap-3 border-b px-6 py-3.5 last:border-b-0 md:grid-cols-[1.6fr_repeat(4,1fr)]",
        striped ? "bg-bg-soft/30" : "",
      ].join(" ")}
    >
      <div className="text-ink text-[13px] font-medium" style={{ letterSpacing: "-0.005em" }}>
        {PERMISSION_LABELS[permission]}
      </div>
      {ROLES.map((r) => {
        const has = permissionsFor(r).includes(permission);
        return (
          <div key={r} className="flex items-center justify-start md:justify-center">
            <span className="text-ink-faint mr-2 text-[11px] font-medium md:hidden">
              {ROLE_LABELS[r]}
            </span>
            {has ? (
              <span className="bg-accent-bg text-accent flex h-6 w-6 items-center justify-center rounded-full">
                <Check size={12} strokeWidth={2.5} />
              </span>
            ) : (
              <span className="bg-surface-deep text-ink-faint flex h-6 w-6 items-center justify-center rounded-full">
                <Minus size={12} strokeWidth={2} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeamTable({ currentRole, canManage }: { currentRole: Role; canManage: boolean }) {
  return (
    <section>
      <h3
        className="display text-ink m-0 mb-3 text-[18px] font-medium md:text-[20px]"
        style={{ letterSpacing: "-0.015em" }}
      >
        Team
      </h3>
      <div className="bg-surface border-border overflow-hidden rounded-2xl border">
        {TEAM.map((member, i) => (
          <div
            key={member.id}
            className={[
              "grid items-center gap-4 px-5 py-4 md:grid-cols-[auto_1fr_auto_auto] md:px-6",
              i > 0 ? "border-border-soft border-t" : "",
            ].join(" ")}
          >
            <div
              className={[
                "display flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-medium",
                member.you ? "bg-accent text-ink-on-accent" : "bg-surface-deep text-ink-soft",
              ].join(" ")}
            >
              {member.initials}
            </div>
            <div className="min-w-0">
              <div
                className="text-ink text-[14px] font-semibold"
                style={{ letterSpacing: "-0.005em" }}
              >
                {member.name}
                {member.you ? (
                  <span className="text-ink-mute ml-2 text-[11px] font-medium">(you)</span>
                ) : null}
              </div>
              <div className="text-ink-mute mt-0.5 font-mono text-[11px]">{member.id}</div>
            </div>
            <select
              defaultValue={member.role}
              disabled={!canManage || member.you}
              className="bg-bg-soft text-ink border-border focus:border-accent rounded-[10px] border px-3 py-2 text-[13px] font-medium transition-colors disabled:opacity-60"
              aria-label={`Role for ${member.name}`}
            >
              {/* Clinic members can never be promoted to super_admin from
                  here — that role is platform-level (Attuna staff only) and
                  is granted out-of-band. */}
              {ROLES.filter((r) => r !== "super_admin").map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <PillButton variant="ghost" size="sm" disabled={!canManage || member.you}>
              Remove
            </PillButton>
          </div>
        ))}
      </div>
      <p
        className="text-ink-mute mt-3 text-[12px] font-medium italic"
        style={{ letterSpacing: "-0.005em" }}
      >
        You are previewing as <strong className="text-ink">{ROLE_LABELS[currentRole]}</strong>.
        Switch above to see what teammates with other roles see.
      </p>
    </section>
  );
}
