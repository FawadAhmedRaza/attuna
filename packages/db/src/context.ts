import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "./schema";
import type { WorkspaceRole } from "./schema/workspace-member";

export interface WorkspaceContext {
  readonly userId: string;
  readonly workspaceId: string;
}

// `AuditContext` extends WorkspaceContext with the caller's role, which we
// need to denormalize into every audit_log row (HIPAA.md §6 — role at
// time-of-action is recorded so later role changes don't rewrite history).
// Use this in any repo method that writes an audit row.
export interface AuditContext extends WorkspaceContext {
  readonly role: WorkspaceRole;
}

export type Database = PostgresJsDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Wraps a callback in a transaction that:
 *   1. Sets `app.current_workspace_id` + `app.current_user_id` — read by
 *      the RLS policies on PHI tables.
 *   2. SETs the connection role to `attuna_app` (NOSUPERUSER, NOBYPASSRLS).
 *      RLS only applies to non-superusers; without this the migration-
 *      privileged `attuna` user would bypass the policies and PHI from
 *      other workspaces would leak. See migration 0003.
 *
 * The role + session vars are LOCAL — they revert on COMMIT/ROLLBACK.
 */
export async function withWorkspaceContext<T>(
  db: Database,
  ctx: WorkspaceContext,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE attuna_app`);
    await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ctx.workspaceId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${ctx.userId}, true)`);
    return fn(tx);
  });
}
