import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../client";
import type { AuditContext, Database } from "../context";
import { entryAad } from "../lib/envelope";
import { __testing, createKmsClient } from "../lib/kms";
import type { KmsClient } from "../lib/kms";
import { auditLog } from "../schema/audit-log";
import { entry as entryTable } from "../schema/entry";
import { user } from "../schema/user";
import { workspace } from "../schema/workspace";
import { workspaceInvite } from "../schema/workspace-invite";
import { workspaceMember } from "../schema/workspace-member";
import { workspaceSurvey } from "../schema/workspace-survey";
import { workspaceRepo } from "./workspace-repo";
import { clientRepo } from "./client-repo";

import { entryRepo } from "./entry-repo";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "..", "..", "migrations");

let db: Database;
let pg: Awaited<ReturnType<typeof createDb>>["client"];
let kms: KmsClient;

beforeAll(async () => {
  const created = createDb(process.env.DATABASE_URL);
  db = created.db;
  pg = created.client;
  await migrate(db, { migrationsFolder });
  kms = createKmsClient();
});

afterAll(async () => {
  await pg.end();
});

beforeEach(async () => {
  await db.delete(workspaceInvite);
  await db.delete(workspaceSurvey);
  await db.delete(workspaceMember);
  // Deleting workspaces cascades to client → entry → audit_log via FKs.
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

describe("entryRepo", () => {
  it("encrypt/decrypt round-trip via create + listForClient", async () => {
    const owner = await makeUser("e-rt");
    const ws = await makeWorkspace(owner.id, "e-rt-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Maya R." });

    const body = "Couldn't sleep last night. Kept thinking about Sunday.";
    const writtenAt = new Date("2026-04-28T23:42:00Z");
    const created = await entryRepo.create(db, ctx, kms, {
      clientId: c.id,
      body,
      writtenAt,
    });
    expect(created).not.toBeNull();
    expect(created?.body).toBe(body);
    expect(created?.wordCount).toBe(8);

    const list = await entryRepo.listForClient(db, ctx, kms, c.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.body).toBe(body);
    expect(list[0]?.writtenAt.toISOString()).toBe(writtenAt.toISOString());
  });

  it("ciphertext column does not contain plaintext", async () => {
    const owner = await makeUser("e-cipher");
    const ws = await makeWorkspace(owner.id, "e-cipher-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "X" });
    const secret = "absolutely-unique-marker-string-XYZZY-2026";

    await entryRepo.create(db, ctx, kms, {
      clientId: c.id,
      body: secret,
      writtenAt: new Date(),
    });

    // Read the raw row inside RLS scope. The ciphertext bytea must not
    // contain the plaintext marker anywhere.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const rows = await tx.select().from(entryTable);
      expect(rows).toHaveLength(1);
      const cipherHex = rows[0]?.bodyCiphertext.toString("hex") ?? "";
      const marker = Buffer.from(secret, "utf8").toString("hex");
      expect(cipherHex.includes(marker)).toBe(false);
    });
  });

  it("RLS hides entries from other workspaces", async () => {
    const aOwner = await makeUser("e-rls-a");
    const bOwner = await makeUser("e-rls-b");
    const wsA = await makeWorkspace(aOwner.id, "e-rls-a-ws");
    const wsB = await makeWorkspace(bOwner.id, "e-rls-b-ws");
    const cA = await clientRepo.create(db, ownerCtx(wsA.id, aOwner.id), { displayName: "A" });
    const cB = await clientRepo.create(db, ownerCtx(wsB.id, bOwner.id), { displayName: "B" });

    await entryRepo.create(db, ownerCtx(wsA.id, aOwner.id), kms, {
      clientId: cA.id,
      body: "A1",
      writtenAt: new Date(),
    });
    await entryRepo.create(db, ownerCtx(wsB.id, bOwner.id), kms, {
      clientId: cB.id,
      body: "B1",
      writtenAt: new Date(),
    });

    // Raw scan with no workspace context → zero rows.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', '', true)`);
      const rows = await tx.select().from(entryTable);
      expect(rows).toEqual([]);
    });

    // List inside owner-A's context returns only A1.
    const aList = await entryRepo.listForClient(db, ownerCtx(wsA.id, aOwner.id), kms, cA.id);
    expect(aList.map((e) => e.body)).toEqual(["A1"]);
  });

  it("clinician isolation: cannot create entries for another clinician's client", async () => {
    const owner = await makeUser("e-ci-own");
    const ws = await makeWorkspace(owner.id, "e-ci-ws");
    const drA = await makeUser("e-ci-a");
    const drB = await makeUser("e-ci-b");

    const drBClient = await clientRepo.create(db, ownerCtx(ws.id, owner.id), {
      displayName: "B's client",
      assignedClinicianId: drB.id,
    });

    // Clinician A tries to create an entry for one of B's clients.
    const created = await entryRepo.create(db, clinicianCtx(ws.id, drA.id), kms, {
      clientId: drBClient.id,
      body: "should not land",
      writtenAt: new Date(),
    });
    expect(created).toBeNull();

    // And listing returns nothing — same client, viewed from the wrong
    // clinician.
    const listForA = await entryRepo.listForClient(
      db,
      clinicianCtx(ws.id, drA.id),
      kms,
      drBClient.id,
    );
    expect(listForA).toEqual([]);
  });

  it("AAD binding: tampering with body_aad fails decryption", async () => {
    const owner = await makeUser("e-aad");
    const ws = await makeWorkspace(owner.id, "e-aad-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Aad" });
    const created = await entryRepo.create(db, ctx, kms, {
      clientId: c.id,
      body: "real entry body",
      writtenAt: new Date(),
    });
    if (!created) throw new Error("create failed");

    // Mutate the stored AAD out-of-band. With a non-matching AAD, the
    // GCM auth tag check inside decryptEnvelope must reject the row.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      await tx.update(entryTable).set({ bodyAad: "tampered" }).where(eq(entryTable.id, created.id));
    });

    await expect(entryRepo.listForClient(db, ctx, kms, c.id)).rejects.toThrow();
  });

  it("audit log: create writes entry.create with client_id + word_count", async () => {
    const owner = await makeUser("e-audit");
    const ws = await makeWorkspace(owner.id, "e-audit-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Aud" });
    const created = await entryRepo.create(db, ctx, kms, {
      clientId: c.id,
      body: "one two three",
      writtenAt: new Date(),
    });
    if (!created) throw new Error("create failed");

    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const rows = await tx.select().from(auditLog).where(eq(auditLog.action, "entry.create"));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.targetId).toBe(created.id);
      expect(rows[0]?.detail).toEqual({ client_id: c.id, word_count: 3 });
    });
  });

  it("KMS dev shim: data key never appears in the wrapped form", async () => {
    // Sanity check on the KMS shim itself — wrapped key must not equal
    // the plaintext key (would mean encryption silently failed).
    const Dev = __testing.DevKmsClient;
    const client = new Dev();
    const dk = await client.generateDataKey();
    expect(dk.plaintext.length).toBe(__testing.KEY_BYTES);
    expect(dk.wrapped.length).toBe(__testing.WRAPPED_BYTES);
    expect(dk.plaintext.equals(dk.wrapped.subarray(12, 12 + __testing.KEY_BYTES))).toBe(false);

    const round = await client.decryptDataKey(dk.wrapped);
    expect(round.equals(dk.plaintext)).toBe(true);
  });

  it("AAD helper format matches the schema convention", () => {
    expect(entryAad("ws1", "cl1", "en1")).toBe("entry:ws1:cl1:en1");
  });
});
