// Client invites — therapist invites a patient to journal. Token format
// matches workspace_invite (M1.5): 32-byte CSPRNG, base64url-encoded,
// only SHA-256 hash stored.
//
// Authorization model:
//   • Therapist-side methods (create, listPendingForClient, revoke,
//     resend) take an AuditContext and write a synchronous audit row.
//   • `findByToken` runs unscoped — the caller is the anonymous
//     invitee. No workspace context, no audit row at this stage; the
//     audit row for the acceptance is written by `accept()` once it
//     has a workspace_id from the looked-up row.

import { and, asc, eq } from "drizzle-orm";

import type { AuditContext, Database, Transaction, WorkspaceContext } from "../context";
import { withWorkspaceContext } from "../context";
import { generateInviteToken, hashInviteToken, isInviteExpired } from "../lib/invite-token";
import { auditLog, type NewAuditLog } from "../schema/audit-log";
import { client as clientTable } from "../schema/client";
import { clientInvite, type ClientInvite, type NewClientInvite } from "../schema/client-invite";

import { auditRepo } from "./audit-repo";

export interface CreateClientInviteInput {
  readonly clientId: string;
  readonly email: string;
  readonly ttlDays?: number;
}

export interface CreatedClientInvite {
  readonly invite: ClientInvite;
  /** Raw token — surface in the UI once, then forget. Only the hash persists. */
  readonly token: string;
}

async function writeAnonymousAuditInTx(
  tx: Transaction,
  input: Omit<NewAuditLog, "id" | "createdAt">,
): Promise<void> {
  await tx.insert(auditLog).values(input);
}

export const clientInviteRepo = {
  async create(
    db: Database,
    ctx: AuditContext,
    input: CreateClientInviteInput,
  ): Promise<CreatedClientInvite> {
    const { token, tokenHash, expiresAt } = generateInviteToken(input.ttlDays);

    return withWorkspaceContext(db, ctx, async (tx) => {
      // Verify the parent client lives in this workspace before issuing
      // an invite. RLS would already gate cross-workspace inserts, but
      // an explicit check returns a cleaner error message and lets the
      // audit detail reference the client we tried to invite for.
      const parents = await tx
        .select({ id: clientTable.id })
        .from(clientTable)
        .where(eq(clientTable.id, input.clientId))
        .limit(1);
      if (!parents[0]) {
        throw new Error("Client not found in this workspace");
      }

      const insertable: NewClientInvite = {
        workspaceId: ctx.workspaceId,
        clientId: input.clientId,
        email: input.email,
        tokenHash,
        expiresAt,
        invitedBy: ctx.userId,
      };
      const [row] = await tx.insert(clientInvite).values(insertable).returning();
      if (!row) {
        throw new Error("Failed to create client invite");
      }

      await auditRepo.writeInTx(tx, ctx, {
        action: "client.invite",
        targetType: "client",
        targetId: input.clientId,
        detail: { invite_id: row.id, email: maskEmail(input.email) },
      });

      return { invite: row, token };
    });
  },

  async listPendingForClient(
    db: Database,
    ctx: WorkspaceContext,
    clientId: string,
  ): Promise<ClientInvite[]> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      return tx
        .select()
        .from(clientInvite)
        .where(
          and(eq(clientInvite.clientId, clientId), eq(clientInvite.workspaceId, ctx.workspaceId)),
        )
        .orderBy(asc(clientInvite.createdAt));
    });
  },

  async revoke(db: Database, ctx: AuditContext, inviteId: string): Promise<void> {
    await withWorkspaceContext(db, ctx, async (tx) => {
      // Capture the targeted client_id so the audit row references the
      // PHI subject of the action, not the invite row itself.
      const rows = await tx
        .select({ clientId: clientInvite.clientId })
        .from(clientInvite)
        .where(eq(clientInvite.id, inviteId))
        .limit(1);
      const target = rows[0];
      if (!target) return; // Already gone — idempotent.

      await tx.delete(clientInvite).where(eq(clientInvite.id, inviteId));
      await auditRepo.writeInTx(tx, ctx, {
        action: "client.invite_revoke",
        targetType: "client",
        targetId: target.clientId,
        detail: { invite_id: inviteId },
      });
    });
  },

  /**
   * Look up by raw token. Unscoped (no workspace context) because the
   * caller is the anonymous invitee — by definition they haven't
   * established membership yet. Returns null for unknown / expired /
   * already-accepted tokens; callers can't tell which (intentional, to
   * avoid leaking which tokens were ever valid).
   */
  async findByToken(db: Database, token: string): Promise<ClientInvite | null> {
    const tokenHash = hashInviteToken(token);
    const rows = await db
      .select()
      .from(clientInvite)
      .where(eq(clientInvite.tokenHash, tokenHash))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (row.acceptedAt) return null;
    if (isInviteExpired(row.expiresAt)) return null;
    return row;
  },

  /**
   * Consume an invite + flip the parent client's status to 'active'.
   * Runs unscoped because the caller is the invitee, but writes an
   * audit row with the workspace_id pulled from the invite. actor_role
   * is "client" (the patient themselves); actor_user_id stays null
   * since we don't have a Cognito client identity in M2.2b — that
   * lands with the mobile app in M2.3.
   */
  async accept(
    db: Database,
    token: string,
  ): Promise<{ workspaceId: string; clientId: string } | null> {
    return db.transaction(async (tx) => {
      const tokenHash = hashInviteToken(token);
      const rows = await tx
        .select()
        .from(clientInvite)
        .where(eq(clientInvite.tokenHash, tokenHash))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      if (row.acceptedAt) return null;
      if (isInviteExpired(row.expiresAt)) return null;

      await tx
        .update(clientInvite)
        .set({ acceptedAt: new Date() })
        .where(eq(clientInvite.id, row.id));
      await tx
        .update(clientTable)
        .set({ status: "active" })
        .where(eq(clientTable.id, row.clientId));

      // Anonymous audit — workspace_id is known from the invite, but
      // actor_user_id is null and actor_role is "client" since there's
      // no Cognito identity yet.
      await writeAnonymousAuditInTx(tx, {
        workspaceId: row.workspaceId,
        actorUserId: null,
        actorRole: "client",
        action: "client.invite_accept",
        targetType: "client",
        targetId: row.clientId,
        detail: { invite_id: row.id },
        ip: null,
        userAgent: null,
      });

      return { workspaceId: row.workspaceId, clientId: row.clientId };
    });
  },
};

/**
 * Half-redact an email so a clinic admin reviewing the audit log can
 * verify "yes that's our invitee" without the full address leaking
 * into the jsonb detail blob.
 *   maya@example.com → m***@example.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const head = local.length > 0 ? local[0] : "";
  return `${head}***@${domain}`;
}
