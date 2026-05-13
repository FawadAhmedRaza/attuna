import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { citext } from "./citext";
import { user } from "./user";
import { workspace } from "./workspace";

export const invitableRole = ["admin", "clinician"] as const;
export type InvitableRole = (typeof invitableRole)[number];

export const workspaceInvite = pgTable(
  "workspace_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    email: citext("email").notNull(),
    role: text("role", { enum: invitableRole }).notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    invitedBy: uuid("invited_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("workspace_invite_email_idx").on(t.email),
    index("workspace_invite_workspace_id_idx").on(t.workspaceId),
  ],
);

export type WorkspaceInvite = typeof workspaceInvite.$inferSelect;
export type NewWorkspaceInvite = typeof workspaceInvite.$inferInsert;
