"use client";

import { useCallback, useEffect, useState } from "react";

// `super_admin` is platform-level (Attuna staff). They do not belong to a
// clinic, do not see PHI, and do not have clinical permissions. Their reach is
// limited to platform-admin surfaces (feature flags, license review, kill
// switches). When the real `apps/admin` lands, super_admin moves out of the
// therapist portal entirely; for now it's gated inside this app.
export type Role = "super_admin" | "owner" | "clinic_admin" | "therapist";

export type Permission =
  | "view_clients"
  | "edit_clients"
  | "invite_clients"
  | "view_briefs"
  | "send_suggestions"
  | "view_clinic"
  | "manage_clinic"
  | "manage_therapists"
  | "view_audit"
  | "export_audit"
  | "manage_integrations"
  | "view_billing"
  | "manage_billing"
  | "manage_roles"
  | "view_platform_admin"
  | "manage_feature_flags"
  | "review_licenses";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  owner: "Owner",
  clinic_admin: "Clinic admin",
  therapist: "Therapist",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Attuna staff. Platform-level admin. No clinical access, no PHI.",
  owner: "Full access. Can manage billing, roles, and the practice.",
  clinic_admin: "Manages therapists, integrations, and audit. No billing changes.",
  therapist: "Sees their own clients and briefs. No admin surfaces.",
};

export const ROLES: Role[] = ["super_admin", "owner", "clinic_admin", "therapist"];

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_clients: "View clients",
  edit_clients: "Edit client details",
  invite_clients: "Invite new clients",
  view_briefs: "View session briefs",
  send_suggestions: "Send suggestions to clients",
  view_clinic: "View clinic dashboard",
  manage_clinic: "Edit clinic-wide settings",
  manage_therapists: "Invite & manage therapists",
  view_audit: "View HIPAA audit log",
  export_audit: "Export audit data",
  manage_integrations: "Connect external tools",
  view_billing: "View subscription & invoices",
  manage_billing: "Change plan or payment method",
  manage_roles: "Assign roles & permissions",
  view_platform_admin: "Access platform admin surfaces",
  manage_feature_flags: "Toggle feature flags",
  review_licenses: "Review therapist license submissions",
};

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Clinical work",
    permissions: [
      "view_clients",
      "edit_clients",
      "invite_clients",
      "view_briefs",
      "send_suggestions",
    ],
  },
  {
    label: "Practice administration",
    permissions: ["view_clinic", "manage_clinic", "manage_therapists", "manage_integrations"],
  },
  {
    label: "Compliance",
    permissions: ["view_audit", "export_audit"],
  },
  {
    label: "Account",
    permissions: ["view_billing", "manage_billing", "manage_roles"],
  },
  {
    label: "Platform (Attuna staff only)",
    permissions: ["view_platform_admin", "manage_feature_flags", "review_licenses"],
  },
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    "view_platform_admin",
    "manage_feature_flags",
    "review_licenses",
    // Audit surface is shared so support can debug without crossing into PHI.
    // The audit log itself must never contain PHI per HIPAA.md (TBD).
    "view_audit",
  ],
  owner: [
    "view_clients",
    "edit_clients",
    "invite_clients",
    "view_briefs",
    "send_suggestions",
    "view_clinic",
    "manage_clinic",
    "manage_therapists",
    "view_audit",
    "export_audit",
    "manage_integrations",
    "view_billing",
    "manage_billing",
    "manage_roles",
  ],
  clinic_admin: [
    "view_clients",
    "edit_clients",
    "invite_clients",
    "view_briefs",
    "send_suggestions",
    "view_clinic",
    "manage_clinic",
    "manage_therapists",
    "view_audit",
    "export_audit",
    "manage_integrations",
    "view_billing",
  ],
  therapist: ["view_clients", "edit_clients", "invite_clients", "view_briefs", "send_suggestions"],
};

export function permissionsFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHas(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

const ROLE_KEY = "attuna_role_v1";

function readRole(): Role {
  if (typeof window === "undefined") return "owner";
  try {
    const raw = localStorage.getItem(ROLE_KEY);
    if (raw === "super_admin" || raw === "owner" || raw === "clinic_admin" || raw === "therapist") {
      return raw;
    }
  } catch {}
  return "owner";
}

// Module-level subscriber set so multiple useRole callers stay in sync within
// the same session (e.g. sidebar + page reflecting a role switch live).
const subscribers = new Set<(role: Role) => void>();

export function useRole() {
  const [role, setRoleState] = useState<Role>("owner");

  useEffect(() => {
    setRoleState(readRole());
    const handler = (next: Role) => setRoleState(next);
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  const setRole = useCallback((next: Role) => {
    try {
      localStorage.setItem(ROLE_KEY, next);
    } catch {}
    setRoleState(next);
    subscribers.forEach((s) => s(next));
  }, []);

  const can = useCallback((permission: Permission) => roleHas(role, permission), [role]);

  return { role, setRole, can };
}
