// Highest-sensitivity PHI table in the system: raw journal entries.
// HIPAA.md §5 mandates envelope encryption — the body is never stored
// in plaintext. Schema columns mirror the EnvelopeCiphertext shape in
// `lib/envelope.ts`. `word_count` is a non-PHI aggregate kept plaintext
// so list views and longitudinal charts don't need to decrypt every row.

import { customType, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { client } from "./client";
import { workspace } from "./workspace";

// Drizzle pg-core doesn't ship a bytea helper directly; this round-trips
// Node Buffers through postgres-js without losing fidelity.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const entry = pgTable(
  "entry",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    bodyCiphertext: bytea("body_ciphertext").notNull(),
    bodyNonce: bytea("body_nonce").notNull(),
    bodyWrappedKey: bytea("body_wrapped_key").notNull(),
    // AAD is plaintext but authenticated by GCM; storing it (rather than
    // recomputing) lets future schema changes evolve the AAD format
    // without invalidating existing rows. Always equal to
    // `entry:{workspace_id}:{client_id}:{id}` for v1 entries.
    bodyAad: text("body_aad").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    // `written_at` is the time the client said they wrote it (mobile may
    // upload offline-captured entries hours or days later). `created_at`
    // is server-side and used for ordering / audit alignment.
    writtenAt: timestamp("written_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("entry_workspace_id_idx").on(t.workspaceId),
    index("entry_client_written_idx").on(t.clientId, t.writtenAt),
  ],
);

export type Entry = typeof entry.$inferSelect;
export type NewEntry = typeof entry.$inferInsert;
