import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../client";
import type { AuditContext, Database } from "../context";
import { auditLog } from "../schema/audit-log";
import { client as clientTable } from "../schema/client";
import { user } from "../schema/user";
import { workspace } from "../schema/workspace";
import { workspaceInvite } from "../schema/workspace-invite";
import { workspaceMember } from "../schema/workspace-member";
import { workspaceSurvey } from "../schema/workspace-survey";
import { workspaceRepo } from "./workspace-repo";

import { clientRepo } from "./client-repo";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "..", "..", "migrations");

let db: Database;
let pg: Awaited<ReturnType<typeof createDb>>["client"];

beforeAll(async () => {
  const created = createDb(process.env.DATABASE_URL);
  db = created.db;
  pg = created.client;
  await migrate(db, { migrationsFolder });
});

afterAll(async () => {
  await pg.end();
});

beforeEach(async () => {
  // Order matters — children before parents. The new PHI tables are
  // RLS-protected; deleting requires the workspace session var set,
  // OR a row-bypass. We use `set_config` with no var (i.e. NULL) which
  // matches no rows under the policy. Tests that need to clear PHI
  // tables must do it inside their own withWorkspaceContext block, OR
  // we wipe via raw SQL as the table owner with FORCE — which the
  // policy denies. Simpler: temporarily set a permissive workspace_id
  // for each delete by passing a hardcoded UUID; since deletes match
  // no rows, that's a no-op. Use a TRUNCATE which bypasses RLS for
  // owners only when RLS is not FORCEd — but ours is FORCEd. The
  // pragmatic answer: DELETE inside an explicit `set_config('', '...')`
  // session, then delete by workspace one at a time. We don't have
  // many workspaces per test, so we use a transaction that sets a
  // wildcard and removes via a CASCADE from `workspace` rows
  // (workspace.id → client.workspace_id ON DELETE CASCADE clears
  // both client and audit_log rows). Same for workspace_survey etc.
  await db.delete(workspaceInvite);
  await db.delete(workspaceSurvey);
  await db.delete(workspaceMember);
  // Deleting workspaces cascades to client + audit_log (FK ON DELETE CASCADE).
  await db.delete(workspace);
  await db.delete(user);
});

async function makeUser(suffix: string) {
  const [created] = await db
    .insert(user)
    .values({
      cognitoSub: `sub-${suffix}-${Math.random()}`,
      email: `user-${suffix}-${Math.random()}@example.test`,
      name: `User ${suffix}`,
    })
    .returning();
  if (!created) throw new Error("user insert failed");
  return created;
}

async function makeWorkspace(ownerId: string, slug: string, name = slug) {
  return workspaceRepo.create(db, { slug, name, ownerId });
}

function ownerCtx(workspaceId: string, userId: string): AuditContext {
  return { workspaceId, userId, role: "owner" };
}

function clinicianCtx(workspaceId: string, userId: string): AuditContext {
  return { workspaceId, userId, role: "clinician" };
}

describe("clientRepo", () => {
  it("creates a client and writes an audit row in the same transaction", async () => {
    const owner = await makeUser("c-create");
    const ws = await makeWorkspace(owner.id, "c-create-ws");
    const ctx = ownerCtx(ws.id, owner.id);

    const created = await clientRepo.create(db, ctx, { displayName: "Maya R." });
    expect(created.displayName).toBe("Maya R.");
    expect(created.workspaceId).toBe(ws.id);
    expect(created.assignedClinicianId).toBe(owner.id);
    expect(created.status).toBe("invited");

    // Audit row exists and references the created client. Must use the
    // RLS session var to see it.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const rows = await tx.select().from(auditLog).where(eq(auditLog.targetId, created.id));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.action).toBe("client.create");
      expect(rows[0]?.actorUserId).toBe(owner.id);
      expect(rows[0]?.actorRole).toBe("owner");
    });
  });

  it("lists all workspace clients for an owner", async () => {
    const owner = await makeUser("c-list-owner");
    const ws = await makeWorkspace(owner.id, "c-list-ws");
    const ctx = ownerCtx(ws.id, owner.id);

    await clientRepo.create(db, ctx, { displayName: "A" });
    await clientRepo.create(db, ctx, { displayName: "B" });
    await clientRepo.create(db, ctx, { displayName: "C" });

    const list = await clientRepo.list(db, ctx);
    expect(list).toHaveLength(3);
  });

  it("scopes list to assigned_clinician_id for clinician callers", async () => {
    const owner = await makeUser("c-iso-owner");
    const ws = await makeWorkspace(owner.id, "c-iso-ws");
    const drA = await makeUser("c-iso-a");
    const drB = await makeUser("c-iso-b");

    const ownerC = ownerCtx(ws.id, owner.id);
    await clientRepo.create(db, ownerC, { displayName: "A's client", assignedClinicianId: drA.id });
    await clientRepo.create(db, ownerC, { displayName: "B's client", assignedClinicianId: drB.id });
    await clientRepo.create(db, ownerC, { displayName: "B's other", assignedClinicianId: drB.id });

    const aList = await clientRepo.list(db, clinicianCtx(ws.id, drA.id));
    expect(aList).toHaveLength(1);
    expect(aList[0]?.displayName).toBe("A's client");

    const bList = await clientRepo.list(db, clinicianCtx(ws.id, drB.id));
    expect(bList).toHaveLength(2);
  });

  it("RLS hides clients from other workspaces", async () => {
    const ownerA = await makeUser("rls-a");
    const ownerB = await makeUser("rls-b");
    const wsA = await makeWorkspace(ownerA.id, "rls-a-ws");
    const wsB = await makeWorkspace(ownerB.id, "rls-b-ws");

    await clientRepo.create(db, ownerCtx(wsA.id, ownerA.id), { displayName: "A1" });
    await clientRepo.create(db, ownerCtx(wsA.id, ownerA.id), { displayName: "A2" });
    await clientRepo.create(db, ownerCtx(wsB.id, ownerB.id), { displayName: "B1" });

    // Owner-A queries inside their own context → sees only A1, A2
    const seen = await clientRepo.list(db, ownerCtx(wsA.id, ownerA.id));
    expect(seen.map((c) => c.displayName).sort()).toEqual(["A1", "A2"]);

    // Raw read with NO workspace context → policy returns zero rows.
    // We have to drop to the non-superuser role here too, since the
    // connection user (attuna) is a superuser in dev and bypasses RLS.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', '', true)`);
      const rows = await tx.select().from(clientTable);
      expect(rows).toEqual([]);
    });
  });

  it("findById returns null for clients owned by a different clinician (clinician role)", async () => {
    const owner = await makeUser("fb-owner");
    const ws = await makeWorkspace(owner.id, "fb-ws");
    const drA = await makeUser("fb-a");
    const drB = await makeUser("fb-b");

    const drBClient = await clientRepo.create(db, ownerCtx(ws.id, owner.id), {
      displayName: "B's client",
      assignedClinicianId: drB.id,
    });

    const seenByA = await clientRepo.findById(db, clinicianCtx(ws.id, drA.id), drBClient.id);
    expect(seenByA).toBeNull();

    const seenByB = await clientRepo.findById(db, clinicianCtx(ws.id, drB.id), drBClient.id);
    expect(seenByB?.id).toBe(drBClient.id);
  });

  it("assign() updates clinician and writes a client.assign audit row with before/after", async () => {
    const owner = await makeUser("asg-owner");
    const ws = await makeWorkspace(owner.id, "asg-ws");
    const drA = await makeUser("asg-a");
    const drB = await makeUser("asg-b");

    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, {
      displayName: "Moves around",
      assignedClinicianId: drA.id,
    });
    await clientRepo.assign(db, ctx, c.id, drB.id);

    const after = await clientRepo.findById(db, ctx, c.id);
    expect(after?.assignedClinicianId).toBe(drB.id);

    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const rows = await tx.select().from(auditLog).where(eq(auditLog.action, "client.assign"));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.detail).toEqual({ from: drA.id, to: drB.id });
    });
  });
});
