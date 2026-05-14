import { eq } from "drizzle-orm";

import type { Database, WorkspaceContext } from "../context";
import { withWorkspaceContext } from "../context";
import {
  type NewWorkspaceSurvey,
  type WorkspaceSurvey,
  workspaceSurvey,
} from "../schema/workspace-survey";

export const surveyRepo = {
  /**
   * Persists onboarding survey answers. No WorkspaceContext because the
   * caller is the onboarding action, which has just created the workspace
   * and has no membership yet (the owner seat is created in the same flow).
   */
  async create(db: Database, input: NewWorkspaceSurvey): Promise<WorkspaceSurvey> {
    const [row] = await db.insert(workspaceSurvey).values(input).returning();
    if (!row) {
      throw new Error("Failed to create workspace survey");
    }
    return row;
  },

  async findByWorkspace(db: Database, ctx: WorkspaceContext): Promise<WorkspaceSurvey | null> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const rows = await tx
        .select()
        .from(workspaceSurvey)
        .where(eq(workspaceSurvey.workspaceId, ctx.workspaceId))
        .limit(1);
      return rows[0] ?? null;
    });
  },
};
