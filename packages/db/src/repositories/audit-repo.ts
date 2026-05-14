// Single write path for audit_log rows. HIPAA.md §6: every PHI op writes
// one of these synchronously inside the same transaction as the data op.
// Append-only: no update/delete methods exist or should be added.
//
// Two entry points:
//   • `writeInTx(tx, ctx, input)` — call when the caller already owns the
//     transaction (the usual case — repos like clientRepo wrap their data
//     op + audit write in one withWorkspaceContext block).
//   • `write(db, ctx, input)` — call for standalone audit events that
//     don't accompany a data op (e.g. auth.signin success/failure).

import type { AuditContext, Database, Transaction, WorkspaceContext } from "../context";
import { withWorkspaceContext } from "../context";
import { type NewAuditLog, auditLog } from "../schema/audit-log";

export interface AuditWriteInput {
  readonly action: string;
  readonly targetType: string;
  readonly targetId?: string | null;
  readonly detail?: Record<string, unknown> | null;
  readonly ip?: string | null;
  readonly userAgent?: string | null;
}

function build(ctx: AuditContext, input: AuditWriteInput): NewAuditLog {
  return {
    workspaceId: ctx.workspaceId,
    actorUserId: ctx.userId,
    actorRole: ctx.role,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    detail: input.detail ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
  };
}

export const auditRepo = {
  /**
   * Write an audit row inside an existing transaction. The caller must
   * already have set `app.current_workspace_id` (this is what
   * withWorkspaceContext does); the RLS policy on audit_log requires it.
   */
  async writeInTx(tx: Transaction, ctx: AuditContext, input: AuditWriteInput): Promise<void> {
    await tx.insert(auditLog).values(build(ctx, input));
  },

  /**
   * Standalone audit write. Opens a transaction, sets the session var,
   * inserts the row. Use only when there's no accompanying data op
   * (e.g. failed sign-in attempts — no other DB change to bundle with).
   */
  async write(db: Database, ctx: AuditContext, input: AuditWriteInput): Promise<void> {
    await withWorkspaceContext(db, ctx, async (tx) => {
      await tx.insert(auditLog).values(build(ctx, input));
    });
  },

  /**
   * Reads for the admin audit log viewer. RLS still applies — caller must
   * be inside withWorkspaceContext. No audit row written for audit reads
   * (admin viewing the log is itself an audited "session" operation
   * handled at the route level, not here).
   */
  async listForWorkspace(
    db: Database,
    ctx: WorkspaceContext,
    limit = 100,
  ): Promise<Array<typeof auditLog.$inferSelect>> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      return tx.select().from(auditLog).orderBy(auditLog.createdAt).limit(limit);
    });
  },
};
