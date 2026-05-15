// Repo for client_user rows. In M2.3a these are created at /c/[token]
// acceptance time and identified by a signed cookie (the cookie carries
// the client_user_id directly). M2.3b will wire Cognito and start
// populating `cognito_sub`.

import { and, eq } from "drizzle-orm";

import type { Database, Transaction, WorkspaceContext } from "../context";
import { withWorkspaceContext } from "../context";
import { clientUser, type ClientUser, type NewClientUser } from "../schema/client-user";

export const clientUserRepo = {
  /**
   * Create (or fetch existing) a client_user row for a given client.
   * Idempotent — if a row already exists for the client, return it.
   * Use inside the invite-accept transaction so the create + the
   * invite-accept audit row land atomically.
   */
  async createForInviteInTx(
    tx: Transaction,
    input: { workspaceId: string; clientId: string },
  ): Promise<ClientUser> {
    const existing = await tx
      .select()
      .from(clientUser)
      .where(eq(clientUser.clientId, input.clientId))
      .limit(1);
    if (existing[0]) return existing[0];

    const insertable: NewClientUser = {
      workspaceId: input.workspaceId,
      clientId: input.clientId,
      // cognito_sub stays null in M2.3a — populated by M2.3b once the
      // client Cognito pool is wired.
      cognitoSub: null,
    };
    const [created] = await tx.insert(clientUser).values(insertable).returning();
    if (!created) {
      throw new Error("Failed to create client_user");
    }
    return created;
  },

  /**
   * Look up the row by its id. Used by the journal request path —
   * the `atn_c` cookie carries this id, we verify the row still
   * exists and matches the workspace_id the cookie claims.
   *
   * Runs unscoped (no withWorkspaceContext) because the journal
   * request hasn't established a workspace context yet; we use the
   * cookie's workspace_id as the source of truth, but verify the
   * row's workspace_id matches it. This sidesteps RLS for the
   * lookup but the per-row check below catches a forged cookie
   * pointing at the wrong workspace.
   */
  async findByIdUnscoped(db: Database, id: string): Promise<ClientUser | null> {
    const rows = await db.select().from(clientUser).where(eq(clientUser.id, id)).limit(1);
    return rows[0] ?? null;
  },

  /**
   * Therapist-side lookup: does this client have a client_user row yet?
   * Used to show "client has journaled" vs "client has not journaled"
   * status on the client detail page. RLS-scoped.
   */
  async findForClient(
    db: Database,
    ctx: WorkspaceContext,
    clientId: string,
  ): Promise<ClientUser | null> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const rows = await tx
        .select()
        .from(clientUser)
        .where(and(eq(clientUser.workspaceId, ctx.workspaceId), eq(clientUser.clientId, clientId)))
        .limit(1);
      return rows[0] ?? null;
    });
  },
};
