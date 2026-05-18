// Links a client (the patient) to their auth identity. Post-M2.3c the
// only journaling surface is the mobile app: it signs the user up in
// the Cognito client pool, the `/api/c/link` route consumes the invite
// and stamps `cognito_sub` here, and every subsequent journal request
// authenticates with a Bearer ID token resolved against this row.
//
// `cognito_sub` stays nullable in the column definition because the
// row is provisioned during invite acceptance and the sub lands a
// moment later in the same request (see clientInviteRepo.accept +
// clientUserRepo.setCognitoSubInTx). Rows without a sub are short-
// lived intermediate state, not a supported logged-in form.
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
    // Nullable only for the brief window between row provisioning and
    // /api/c/link stamping the sub in the same request. UNIQUE so two
    // clients can't claim the same Cognito identity.
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
