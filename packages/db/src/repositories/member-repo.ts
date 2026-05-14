import { and, count, eq } from "drizzle-orm";

import type { Database, WorkspaceContext } from "../context";
import { withWorkspaceContext } from "../context";
import { user, type User } from "../schema/user";
import {
  type MemberStatus,
  type NewWorkspaceMember,
  type WorkspaceMember,
  type WorkspaceRole,
  workspaceMember,
} from "../schema/workspace-member";

export interface MemberWithUser {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly role: WorkspaceRole;
  readonly status: MemberStatus;
  readonly joinedAt: Date | null;
}

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

  async listWithUser(db: Database, ctx: WorkspaceContext): Promise<MemberWithUser[]> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const rows = await tx
        .select({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: workspaceMember.role,
          status: workspaceMember.status,
          joinedAt: workspaceMember.joinedAt,
        })
        .from(workspaceMember)
        .innerJoin(user, eq(user.id, workspaceMember.userId))
        .where(eq(workspaceMember.workspaceId, ctx.workspaceId));
      return rows;
    });
  },

  /**
   * Count of active members holding a given role. Used to enforce the
   * single-owner invariant before allowing role changes or removals.
   */
  async countByRole(db: Database, ctx: WorkspaceContext, role: WorkspaceRole): Promise<number> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const [row] = await tx
        .select({ n: count() })
        .from(workspaceMember)
        .where(
          and(
            eq(workspaceMember.workspaceId, ctx.workspaceId),
            eq(workspaceMember.role, role),
            eq(workspaceMember.status, "active"),
          ),
        );
      return row?.n ?? 0;
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

  /**
   * Inserts (or re-activates) a workspace_member row when a user accepts an
   * invite. No WorkspaceContext — the caller has just consumed a valid
   * invite token and isn't yet a member. If a row exists (e.g. they were
   * removed and re-invited) we flip them back to active with the new role.
   */
  async joinFromInvite(
    db: Database,
    input: {
      workspaceId: string;
      userId: string;
      role: WorkspaceRole;
      invitedBy?: string | null;
    },
  ): Promise<void> {
    const now = new Date();
    await db
      .insert(workspaceMember)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        role: input.role,
        status: "active",
        invitedBy: input.invitedBy ?? null,
        joinedAt: now,
      })
      .onConflictDoUpdate({
        target: [workspaceMember.workspaceId, workspaceMember.userId],
        set: {
          role: input.role,
          status: "active",
          invitedBy: input.invitedBy ?? null,
          joinedAt: now,
        },
      });
  },
};
