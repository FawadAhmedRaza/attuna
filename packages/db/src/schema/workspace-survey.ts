import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { workspace } from "./workspace";

export const practiceType = ["solo", "group", "clinic", "training"] as const;
export type PracticeType = (typeof practiceType)[number];

export const clientBand = ["1-10", "11-25", "26-50", "50+"] as const;
export type ClientBand = (typeof clientBand)[number];

export const workspaceSurvey = pgTable("workspace_survey", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspace.id, { onDelete: "cascade" }),
  license: text("license"),
  practiceType: text("practice_type", { enum: practiceType }).notNull(),
  clientCount: text("client_count", { enum: clientBand }),
  specialty: text("specialty")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  priorities: text("priorities")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkspaceSurvey = typeof workspaceSurvey.$inferSelect;
export type NewWorkspaceSurvey = typeof workspaceSurvey.$inferInsert;
