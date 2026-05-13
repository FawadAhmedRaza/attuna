import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./user";
import { workspace } from "./workspace";

export const workspaceRole = ["owner", "admin", "clinician"] as const;
export type WorkspaceRole = (typeof workspaceRole)[number];

export const memberStatus = ["active", "invited", "removed"] as const;
export type MemberStatus = (typeof memberStatus)[number];

export const workspaceMember = pgTable(
  "workspace_member",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: workspaceRole }).notNull(),
    status: text("status", { enum: memberStatus }).notNull().default("active"),
    invitedBy: uuid("invited_by").references(() => user.id, { onDelete: "set null" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] })],
);

export type WorkspaceMember = typeof workspaceMember.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMember.$inferInsert;
