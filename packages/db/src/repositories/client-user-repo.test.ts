import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../client";
import type { AuditContext, Database } from "../context";
import { createKmsClient } from "../lib/kms";
import { auditLog } from "../schema/audit-log";
import { clientUser } from "../schema/client-user";
import { entry as entryTable } from "../schema/entry";
import { user } from "../schema/user";
import { workspace } from "../schema/workspace";
import { workspaceInvite } from "../schema/workspace-invite";
import { workspaceMember } from "../schema/workspace-member";
import { workspaceSurvey } from "../schema/workspace-survey";
import { clientInviteRepo } from "./client-invite-repo";
import { clientRepo } from "./client-repo";
import { entryRepo } from "./entry-repo";
import { workspaceRepo } from "./workspace-repo";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "..", "..", "migrations");

let db: Database;
let pg: Awaited<ReturnType<typeof createDb>>["client"];
const kms = createKmsClient();

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
  await db.delete(workspaceInvite);
  await db.delete(workspaceSurvey);
  await db.delete(workspaceMember);
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

describe("client_user + journal end-to-end", () => {
  it("accept provisions a client_user row exactly once (idempotent)", async () => {
    const owner = await makeUser("cu-acc");
    const ws = await makeWorkspace(owner.id, "cu-acc-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Maya R." });

    const { token } = await clientInviteRepo.create(db, ctx, {
      clientId: c.id,
      email: "maya@example.test",
    });

    const first = await clientInviteRepo.accept(db, token);
    expect(first?.clientUserId).toBeTruthy();

    // Second accept of the same token fails (single-use), so we
    // simulate a re-invite + re-accept and check that a SECOND
    // client_user row isn't created (createForInviteInTx is idempotent
    // per client_id).
    const { token: token2 } = await clientInviteRepo.create(db, ctx, {
      clientId: c.id,
      email: "maya@example.test",
    });
    const second = await clientInviteRepo.accept(db, token2);
    expect(second?.clientUserId).toBe(first?.clientUserId);

    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const rows = await tx.select().from(clientUser).where(eq(clientUser.clientId, c.id));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.cognitoSub).toBeNull();
    });
  });

  it("createAsClient writes an encrypted entry + anonymous audit", async () => {
    const owner = await makeUser("ca-cre");
    const ws = await makeWorkspace(owner.id, "ca-cre-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Devon N." });
    const { token } = await clientInviteRepo.create(db, ctx, {
      clientId: c.id,
      email: "devon@example.test",
    });
    const accepted = await clientInviteRepo.accept(db, token);
    if (!accepted) throw new Error("accept failed");

    const SECRET = "marker-zz-unique-2026-canary";
    const created = await entryRepo.createAsClient(db, kms, accepted, SECRET, new Date());
    expect(created.body).toBe(SECRET);

    // Therapist-side list returns the entry decrypted.
    const therapistList = await entryRepo.listForClient(db, ctx, kms, c.id);
    expect(therapistList).toHaveLength(1);
    expect(therapistList[0]?.body).toBe(SECRET);

    // Raw ciphertext column does NOT contain the plaintext marker.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const [row] = await tx.select().from(entryTable);
      const cipherHex = row?.bodyCiphertext.toString("hex") ?? "";
      const marker = Buffer.from(SECRET, "utf8").toString("hex");
      expect(cipherHex.includes(marker)).toBe(false);
    });

    // Audit row exists with actor_user_id=null, actor_role='client'
    // and client_user_id in detail.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const rows = await tx.select().from(auditLog).where(eq(auditLog.action, "entry.create"));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.actorUserId).toBeNull();
      expect(rows[0]?.actorRole).toBe("client");
      const detail = rows[0]?.detail as { client_id: string; client_user_id: string };
      expect(detail.client_user_id).toBe(accepted.clientUserId);
    });
  });

  it("listAsClient returns only the caller's own entries", async () => {
    // Two clients in the same workspace; clientA writes one, clientB
    // writes two. A and B share workspace but are different patients.
    const owner = await makeUser("la-own");
    const ws = await makeWorkspace(owner.id, "la-own-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const cA = await clientRepo.create(db, ctx, { displayName: "A" });
    const cB = await clientRepo.create(db, ctx, { displayName: "B" });
    const { token: tA } = await clientInviteRepo.create(db, ctx, {
      clientId: cA.id,
      email: "a@example.test",
    });
    const { token: tB } = await clientInviteRepo.create(db, ctx, {
      clientId: cB.id,
      email: "b@example.test",
    });
    const aS = await clientInviteRepo.accept(db, tA);
    const bS = await clientInviteRepo.accept(db, tB);
    if (!aS || !bS) throw new Error("accept failed");

    await entryRepo.createAsClient(db, kms, aS, "A1", new Date(2026, 0, 1));
    await entryRepo.createAsClient(db, kms, bS, "B1", new Date(2026, 0, 2));
    await entryRepo.createAsClient(db, kms, bS, "B2", new Date(2026, 0, 3));

    const aList = await entryRepo.listAsClient(db, kms, aS);
    expect(aList.map((e) => e.body)).toEqual(["A1"]);

    const bList = await entryRepo.listAsClient(db, kms, bS);
    expect(bList.map((e) => e.body).sort()).toEqual(["B1", "B2"]);
  });

  it("summaryForClient returns total + last-written date for the therapist", async () => {
    const owner = await makeUser("sum-own");
    const ws = await makeWorkspace(owner.id, "sum-own-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Sum" });
    const { token } = await clientInviteRepo.create(db, ctx, {
      clientId: c.id,
      email: "sum@example.test",
    });
    const accepted = await clientInviteRepo.accept(db, token);
    if (!accepted) throw new Error("accept failed");

    const empty = await entryRepo.summaryForClient(db, ctx, c.id);
    expect(empty).toEqual({ total: 0, lastWrittenAt: null });

    const t1 = new Date(2026, 3, 1);
    const t2 = new Date(2026, 3, 5);
    await entryRepo.createAsClient(db, kms, accepted, "first", t1);
    await entryRepo.createAsClient(db, kms, accepted, "second", t2);

    const after = await entryRepo.summaryForClient(db, ctx, c.id);
    expect(after.total).toBe(2);
    expect(after.lastWrittenAt?.toISOString()).toBe(t2.toISOString());
  });

  it("client_user RLS hides rows from other workspaces", async () => {
    const oA = await makeUser("cu-rls-a");
    const oB = await makeUser("cu-rls-b");
    const wA = await makeWorkspace(oA.id, "cu-rls-a-ws");
    const wB = await makeWorkspace(oB.id, "cu-rls-b-ws");
    const cA = await clientRepo.create(db, ownerCtx(wA.id, oA.id), { displayName: "A" });
    const cB = await clientRepo.create(db, ownerCtx(wB.id, oB.id), { displayName: "B" });
    const { token: tA } = await clientInviteRepo.create(db, ownerCtx(wA.id, oA.id), {
      clientId: cA.id,
      email: "a@example.test",
    });
    const { token: tB } = await clientInviteRepo.create(db, ownerCtx(wB.id, oB.id), {
      clientId: cB.id,
      email: "b@example.test",
    });
    await clientInviteRepo.accept(db, tA);
    await clientInviteRepo.accept(db, tB);

    // Scoped read under workspace A should only see one client_user row.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${wA.id}, true)`);
      const rows = await tx.select().from(clientUser);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.clientId).toBe(cA.id);
    });
  });
});
