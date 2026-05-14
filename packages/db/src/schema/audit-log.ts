// HIPAA §6: every PHI read and write writes a row here, synchronously,
// inside the same transaction as the operation. Append-only — no UPDATE
// or DELETE methods exist on auditRepo. RLS scopes by workspace_id.
//
// `detail` is jsonb, intended for non-PHI structured context (e.g. a
// {count: 3} for list operations, or {changed_fields: [...]} for updates).
// Client content, names, emails, etc. MUST NEVER land in `detail`.

import { index, inet, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./user";
import { workspace } from "./workspace";

// Action verbs follow a `<entity>.<verb>` shape. Kept as a string column
// (not an enum) so new actions can be added without a migration; the
// reviewer rule in HIPAA.md ensures we don't proliferate ad hoc.
export type AuditAction =
  | "client.list"
  | "client.create"
  | "client.read"
  | "client.update"
  | "client.archive"
  | "client.assign"
  | "entry.list"
  | "entry.read"
  | "entry.create"
  | "brief.read"
  | "brief.generate"
  | "brief.export"
  | "suggestion.create"
  | "suggestion.send"
  | "member.invite"
  | "member.accept"
  | "member.remove"
  | "member.role_change"
  | "workspace.update"
  | "auth.signin"
  | "auth.signin_failed"
  | "auth.signout";

export type AuditTargetType =
  | "client"
  | "entry"
  | "brief"
  | "suggestion"
  | "template"
  | "member"
  | "workspace"
  | "session";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    // `actor_user_id` is nullable for system-initiated actions (scheduled
    // brief generation, etc.). When a user is later hard-deleted, the
    // user-table FK becomes null but the audit row stays — trails outlive
    // accounts (per HIPAA §6 retention rule).
    actorUserId: uuid("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    detail: jsonb("detail"),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_workspace_created_idx").on(t.workspaceId, t.createdAt),
    index("audit_log_actor_created_idx").on(t.actorUserId, t.createdAt),
    index("audit_log_target_idx").on(t.targetType, t.targetId),
  ],
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
