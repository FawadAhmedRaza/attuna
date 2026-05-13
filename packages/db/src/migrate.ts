import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import "dotenv/config";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDb, getDatabaseUrl } from "./client";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "..", "migrations");

const url = getDatabaseUrl();
const { db, client } = createDb(url);

console.log(`Applying migrations to ${maskUrl(url)} ...`);
await migrate(db, { migrationsFolder });
console.log("Migrations applied.");
await client.end();

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return url;
  }
}
