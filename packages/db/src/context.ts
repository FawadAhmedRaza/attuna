import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

export interface WorkspaceContext {
  readonly userId: string;
  readonly workspaceId: string;
}

export type Database = PostgresJsDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Wraps a callback in a transaction that sets the Postgres session
 * variables M2+ RLS policies read from. M1 tables don't enforce RLS
 * yet, but every repo call goes through this so the pattern is in
 * place and we can flip RLS on per-table in M2 without changing
 * call sites.
 */
export async function withWorkspaceContext<T>(
  db: Database,
  ctx: WorkspaceContext,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ctx.workspaceId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${ctx.userId}, true)`);
    return fn(tx);
  });
}
