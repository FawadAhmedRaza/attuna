import { and, eq } from "drizzle-orm";

import type { Database, WorkspaceContext } from "../context";
import { withWorkspaceContext } from "../context";
import { type NewWorkspace, type Workspace, workspace } from "../schema/workspace";
import { type NewWorkspaceMember, workspaceMember } from "../schema/workspace-member";

export interface CreateWorkspaceInput {
  readonly slug: string;
  readonly name: string;
  readonly ownerId: string;
  readonly plan?: string;
}

export const workspaceRepo = {
  /**
   * Creates a workspace and seats the caller as owner.
   * Does NOT take a WorkspaceContext — the workspace doesn't exist yet
   * and the caller may have no other workspace memberships.
   */
  async create(db: Database, input: CreateWorkspaceInput): Promise<Workspace> {
    return db.transaction(async (tx) => {
      const insertable: NewWorkspace = {
        slug: input.slug,
        name: input.name,
        plan: input.plan ?? "solo",
      };
      const [created] = await tx.insert(workspace).values(insertable).returning();
      if (!created) {
        throw new Error("Failed to create workspace");
      }
      const ownerSeat: NewWorkspaceMember = {
        workspaceId: created.id,
        userId: input.ownerId,
        role: "owner",
        status: "active",
        joinedAt: new Date(),
      };
      await tx.insert(workspaceMember).values(ownerSeat);
      return created;
    });
  },

  async findById(db: Database, ctx: WorkspaceContext, id: string): Promise<Workspace | null> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const rows = await tx.select().from(workspace).where(eq(workspace.id, id)).limit(1);
      return rows[0] ?? null;
    });
  },

  async findBySlug(db: Database, slug: string): Promise<Workspace | null> {
    const rows = await db.select().from(workspace).where(eq(workspace.slug, slug)).limit(1);
    return rows[0] ?? null;
  },

  async isSlugAvailable(db: Database, slug: string): Promise<boolean> {
    const existing = await this.findBySlug(db, slug);
    return existing === null;
  },

  async listForUser(db: Database, userId: string): Promise<Workspace[]> {
    return db
      .select({
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        plan: workspace.plan,
        createdAt: workspace.createdAt,
      })
      .from(workspace)
      .innerJoin(
        workspaceMember,
        and(
          eq(workspaceMember.workspaceId, workspace.id),
          eq(workspaceMember.userId, userId),
          eq(workspaceMember.status, "active"),
        ),
      );
  },
};
