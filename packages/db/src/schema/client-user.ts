// Links a client (the patient) to their auth identity. In M2.3a there is
// no Cognito client pool yet, so `cognito_sub` is nullable and the
// `/c/[token]/accept` flow issues a signed `atn_c` cookie carrying the
// client_user_id directly. M2.3b will populate `cognito_sub` and stop
// trusting the cookie alone — the cookie becomes a thin wrapper around
// a real Cognito identity at that point.
//
// One-to-one with client (`client_id UNIQUE`): a client represents a
// single patient under a therapist's care, and a single auth identity
// at a time. If a client switches devices we rotate the cognito_sub on
// this row rather than creating a new one.

import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { client } from "./client";
import { workspace } from "./workspace";

export const clientUser = pgTable(
  "client_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    // Nullable in M2.3a — populated by M2.3b when the Cognito client
    // pool is wired. UNIQUE so two clients can't claim the same Cognito
    // identity.
    cognitoSub: text("cognito_sub"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("client_user_client_id_unique").on(t.clientId),
    uniqueIndex("client_user_cognito_sub_unique").on(t.cognitoSub),
    index("client_user_workspace_idx").on(t.workspaceId),
  ],
);

export type ClientUser = typeof clientUser.$inferSelect;
export type NewClientUser = typeof clientUser.$inferInsert;
