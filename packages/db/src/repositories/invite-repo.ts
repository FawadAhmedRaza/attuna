import { and, eq, isNull } from "drizzle-orm";

import type { Database, WorkspaceContext } from "../context";
import { withWorkspaceContext } from "../context";
import { generateInviteToken, hashInviteToken, isInviteExpired } from "../lib/invite-token";
import {
  type InvitableRole,
  type NewWorkspaceInvite,
  type WorkspaceInvite,
  workspaceInvite,
} from "../schema/workspace-invite";

export interface CreateInviteInput {
  readonly email: string;
  readonly role: InvitableRole;
  readonly invitedBy: string;
  readonly ttlDays?: number;
}

export interface CreatedInvite {
  readonly invite: WorkspaceInvite;
  /**
   * The raw token. Surface this once (in the invite email link)
   * and discard — only the hash is persisted.
   */
  readonly token: string;
}

export const inviteRepo = {
  async create(
    db: Database,
    ctx: WorkspaceContext,
    input: CreateInviteInput,
  ): Promise<CreatedInvite> {
    const { token, tokenHash, expiresAt } = generateInviteToken(input.ttlDays);
    const insertable: NewWorkspaceInvite = {
      workspaceId: ctx.workspaceId,
      email: input.email,
      role: input.role,
      tokenHash,
      expiresAt,
      invitedBy: input.invitedBy,
    };
    return withWorkspaceContext(db, ctx, async (tx) => {
      const [created] = await tx.insert(workspaceInvite).values(insertable).returning();
      if (!created) {
        throw new Error("Failed to create invite");
      }
      return { invite: created, token };
    });
  },

  async listPending(db: Database, ctx: WorkspaceContext): Promise<WorkspaceInvite[]> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      return tx
        .select()
        .from(workspaceInvite)
        .where(
          and(eq(workspaceInvite.workspaceId, ctx.workspaceId), isNull(workspaceInvite.acceptedAt)),
        );
    });
  },

  async revoke(db: Database, ctx: WorkspaceContext, inviteId: string): Promise<void> {
    await withWorkspaceContext(db, ctx, async (tx) => {
      await tx
        .delete(workspaceInvite)
        .where(
          and(eq(workspaceInvite.workspaceId, ctx.workspaceId), eq(workspaceInvite.id, inviteId)),
        );
    });
  },

  /**
   * Looks up an invite by its raw token. No WorkspaceContext — the
   * caller is signed out / has no workspace context yet. Returns null
   * for unknown, expired, or already-accepted invites; callers cannot
   * distinguish those cases (intentional, to avoid leaking which
   * tokens are valid).
   */
  async findByToken(db: Database, token: string): Promise<WorkspaceInvite | null> {
    const tokenHash = hashInviteToken(token);
    const rows = await db
      .select()
      .from(workspaceInvite)
      .where(eq(workspaceInvite.tokenHash, tokenHash))
      .limit(1);
    const invite = rows[0];
    if (!invite) return null;
    if (invite.acceptedAt) return null;
    if (isInviteExpired(invite.expiresAt)) return null;
    return invite;
  },

  async markAccepted(db: Database, inviteId: string): Promise<void> {
    await db
      .update(workspaceInvite)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvite.id, inviteId));
  },
};
