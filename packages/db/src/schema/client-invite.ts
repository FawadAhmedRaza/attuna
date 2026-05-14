// Invite a client (the patient) to journal. Distinct from `workspace_invite`,
// which is for inviting clinicians/admins to a workspace.
//
// HIPAA §2 treats client emails as PHI-adjacent, so this table is RLS-
// scoped by workspace_id and the email field is encrypted-at-rest by
// Postgres (RDS storage-level — column-level envelope encryption is
// reserved for `entry.body` and friends per HIPAA §5).
//
// The `findByToken` path runs WITHOUT a workspace context (the invitee is
// anonymous at that point) so the repo exposes a separate unscoped
// lookup that intentionally bypasses RLS. The token hash is the
// authorization: if you have the raw token, you're allowed to consume
// the invite.

import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { citext } from "./citext";
import { client } from "./client";
import { user } from "./user";
import { workspace } from "./workspace";

export const clientInvite = pgTable(
  "client_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    email: citext("email").notNull(),
    // SHA-256 hex of the raw 32-byte CSPRNG token. Same scheme as
    // workspace invites — token shown to the inviter once, only the
    // hash persists.
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    invitedBy: uuid("invited_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("client_invite_workspace_idx").on(t.workspaceId),
    index("client_invite_client_idx").on(t.clientId),
    index("client_invite_email_idx").on(t.email),
  ],
);

export type ClientInvite = typeof clientInvite.$inferSelect;
export type NewClientInvite = typeof clientInvite.$inferInsert;
