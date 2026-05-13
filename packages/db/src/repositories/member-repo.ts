import { and, eq } from "drizzle-orm";

import type { Database, WorkspaceContext } from "../context";
import { withWorkspaceContext } from "../context";
import {
  type MemberStatus,
  type NewWorkspaceMember,
  type WorkspaceMember,
  type WorkspaceRole,
  workspaceMember,
} from "../schema/workspace-member";

export interface AddMemberInput {
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly invitedBy?: string;
  readonly status?: MemberStatus;
}

export const memberRepo = {
  async findOne(
    db: Database,
    ctx: WorkspaceContext,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const rows = await tx
        .select()
        .from(workspaceMember)
        .where(
          and(eq(workspaceMember.workspaceId, ctx.workspaceId), eq(workspaceMember.userId, userId)),
        )
        .limit(1);
      return rows[0] ?? null;
    });
  },

  async list(db: Database, ctx: WorkspaceContext): Promise<WorkspaceMember[]> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      return tx
        .select()
        .from(workspaceMember)
        .where(eq(workspaceMember.workspaceId, ctx.workspaceId));
    });
  },

  async add(db: Database, ctx: WorkspaceContext, input: AddMemberInput): Promise<WorkspaceMember> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const insertable: NewWorkspaceMember = {
        workspaceId: ctx.workspaceId,
        userId: input.userId,
        role: input.role,
        status: input.status ?? "active",
        invitedBy: input.invitedBy,
        joinedAt: input.status === "invited" ? null : new Date(),
      };
      const [created] = await tx.insert(workspaceMember).values(insertable).returning();
      if (!created) {
        throw new Error("Failed to add workspace member");
      }
      return created;
    });
  },

  async remove(db: Database, ctx: WorkspaceContext, userId: string): Promise<void> {
    await withWorkspaceContext(db, ctx, async (tx) => {
      await tx
        .update(workspaceMember)
        .set({ status: "removed" })
        .where(
          and(eq(workspaceMember.workspaceId, ctx.workspaceId), eq(workspaceMember.userId, userId)),
        );
    });
  },

  async changeRole(
    db: Database,
    ctx: WorkspaceContext,
    userId: string,
    role: WorkspaceRole,
  ): Promise<void> {
    await withWorkspaceContext(db, ctx, async (tx) => {
      await tx
        .update(workspaceMember)
        .set({ role })
        .where(
          and(eq(workspaceMember.workspaceId, ctx.workspaceId), eq(workspaceMember.userId, userId)),
        );
    });
  },

  /**
   * Activates a previously-invited member after they accept their invite.
   * Skips WorkspaceContext because the caller is signing in for the
   * first time and has no context yet — gated only by a valid invite
   * token (validated in `inviteRepo.acceptInvite`).
   */
  async acceptInvite(
    db: Database,
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    const rows = await db
      .update(workspaceMember)
      .set({ status: "active", joinedAt: new Date() })
      .where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, userId)))
      .returning();
    return rows[0] ?? null;
  },
};
