// First PHI table. Carries `display_name` (per HIPAA §5: NOT envelope-
// encrypted; protection is RLS + audit log). Per ARCHITECTURE §3 every
// client carries `workspace_id` and is RLS-isolated.
//
// `assigned_clinician_id` enforces the clinical-trust rule that a clinician
// can only read their own clients within a workspace. Admin override is
// allowed at the application layer (audited).

import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { citext } from "./citext";
import { user } from "./user";
import { workspace } from "./workspace";

export const clientStatus = ["invited", "active", "paused", "archived"] as const;
export type ClientStatus = (typeof clientStatus)[number];

export const client = pgTable(
  "client",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    assignedClinicianId: uuid("assigned_clinician_id").references(() => user.id, {
      onDelete: "set null",
    }),
    displayName: text("display_name").notNull(),
    inviteEmail: citext("invite_email"),
    status: text("status", { enum: clientStatus }).notNull().default("invited"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("client_workspace_id_idx").on(t.workspaceId),
    index("client_workspace_clinician_idx").on(t.workspaceId, t.assignedClinicianId),
  ],
);

export type Client = typeof client.$inferSelect;
export type NewClient = typeof client.$inferInsert;
