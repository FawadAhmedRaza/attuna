import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import type { Database } from "./context";

let cached: { db: Database; client: postgres.Sql } | null = null;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to your .env.local.");
  }
  return url;
}

export function createDb(url = getDatabaseUrl()): { db: Database; client: postgres.Sql } {
  const client = postgres(url, { prepare: false });
  const db = drizzle(client, { schema });
  return { db, client };
}

/**
 * Process-wide singleton for the Next.js server and CLI scripts.
 * Tests should call `createDb` directly with their own URL so each
 * suite owns its connection lifecycle.
 */
export function db(): Database {
  if (!cached) {
    cached = createDb();
  }
  return cached.db;
}
