// First PHI repo. Every method wraps its data op + a synchronous audit
// write inside one withWorkspaceContext transaction — if the audit insert
// fails, the data op rolls back too (HIPAA.md §6).
//
// Clinician isolation is enforced here at the application layer: when the
// caller's role is "clinician", we add an `assigned_clinician_id = userId`
// filter to list/read queries. Admins and owners see all clients in the
// workspace. Per ARCHITECTURE §3 this is a clinical-trust rule, not a
// HIPAA one — RLS handles the workspace boundary.

import { and, eq } from "drizzle-orm";

import type { AuditContext, Database, WorkspaceContext } from "../context";
import { withWorkspaceContext } from "../context";
import { type Client, type NewClient, client } from "../schema/client";

import { auditRepo } from "./audit-repo";

export interface CreateClientInput {
  readonly displayName: string;
  readonly assignedClinicianId?: string | null;
  readonly inviteEmail?: string | null;
}

export interface ListClientsResult {
  readonly clients: Client[];
}

function clinicianFilter(ctx: AuditContext) {
  if (ctx.role === "clinician") {
    return eq(client.assignedClinicianId, ctx.userId);
  }
  return undefined;
}

export const clientRepo = {
  async list(db: Database, ctx: AuditContext): Promise<Client[]> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const filter = clinicianFilter(ctx);
      const rows = await (filter
        ? tx.select().from(client).where(filter)
        : tx.select().from(client));
      await auditRepo.writeInTx(tx, ctx, {
        action: "client.list",
        targetType: "client",
        detail: { count: rows.length, scoped_to_clinician: ctx.role === "clinician" },
      });
      return rows;
    });
  },

  async findById(db: Database, ctx: AuditContext, id: string): Promise<Client | null> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const filter = clinicianFilter(ctx);
      const whereExpr = filter ? and(eq(client.id, id), filter) : eq(client.id, id);
      const rows = await tx.select().from(client).where(whereExpr).limit(1);
      const found = rows[0] ?? null;
      await auditRepo.writeInTx(tx, ctx, {
        action: "client.read",
        targetType: "client",
        targetId: id,
        detail: found ? null : { result: "not_found_or_forbidden" },
      });
      return found;
    });
  },

  async create(db: Database, ctx: AuditContext, input: CreateClientInput): Promise<Client> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      // If no clinician is assigned at creation, default to the creator
      // for owner/admin too — keeps the clinical-trust rule's invariant
      // simple ("every client has a primary clinician"). The creator can
      // reassign later via `assign`.
      const assignedClinicianId = input.assignedClinicianId ?? ctx.userId;
      const insertable: NewClient = {
        workspaceId: ctx.workspaceId,
        displayName: input.displayName,
        assignedClinicianId,
        inviteEmail: input.inviteEmail ?? null,
        status: "invited",
        createdBy: ctx.userId,
      };
      const [created] = await tx.insert(client).values(insertable).returning();
      if (!created) {
        throw new Error("Failed to create client");
      }
      await auditRepo.writeInTx(tx, ctx, {
        action: "client.create",
        targetType: "client",
        targetId: created.id,
        detail: { assigned_clinician_id: assignedClinicianId },
      });
      return created;
    });
  },

  async assign(
    db: Database,
    ctx: AuditContext,
    clientId: string,
    newClinicianId: string,
  ): Promise<void> {
    await withWorkspaceContext(db, ctx, async (tx) => {
      // Reassignment is an admin/owner action — the action layer must
      // gate this. We don't re-enforce role here so an admin can fix a
      // clinician's misassignment without needing a role bump. Audit
      // records the override for review.
      const existing = await tx.select().from(client).where(eq(client.id, clientId)).limit(1);
      if (!existing[0]) {
        // RLS hides cross-workspace, so a miss here means truly not found
        // in this workspace.
        throw new Error("Client not found");
      }
      const previous = existing[0].assignedClinicianId;
      await tx
        .update(client)
        .set({ assignedClinicianId: newClinicianId })
        .where(eq(client.id, clientId));
      await auditRepo.writeInTx(tx, ctx, {
        action: "client.assign",
        targetType: "client",
        targetId: clientId,
        detail: { from: previous, to: newClinicianId },
      });
    });
  },

  /**
   * Count clients in the workspace, respecting clinician isolation. Cheap
   * helper for sidebars and dashboard tiles. Does not write an audit row —
   * the counts themselves aren't PHI (HIPAA.md §2: "aggregate counts" are
   * not PHI when they can't be reidentified). If we ever scope by other
   * dimensions that could leak, revisit.
   */
  async countForCaller(db: Database, ctx: AuditContext): Promise<number> {
    return withWorkspaceContext(db, ctx, async (tx) => {
      const filter = clinicianFilter(ctx);
      const rows = await (filter
        ? tx.select({ id: client.id }).from(client).where(filter)
        : tx.select({ id: client.id }).from(client));
      return rows.length;
    });
  },
};

export type { Client };
