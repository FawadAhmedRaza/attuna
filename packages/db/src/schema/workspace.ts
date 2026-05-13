import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { citext } from "./citext";

export const workspace = pgTable("workspace", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: citext("slug").notNull().unique(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("solo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Workspace = typeof workspace.$inferSelect;
export type NewWorkspace = typeof workspace.$inferInsert;
