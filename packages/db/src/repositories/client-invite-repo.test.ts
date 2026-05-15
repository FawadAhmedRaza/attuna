import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../client";
import type { AuditContext, Database } from "../context";
import { generateInviteToken, hashInviteToken } from "../lib/invite-token";
import { auditLog } from "../schema/audit-log";
import { client as clientTable } from "../schema/client";
import { clientInvite } from "../schema/client-invite";
import { user } from "../schema/user";
import { workspace } from "../schema/workspace";
import { workspaceInvite } from "../schema/workspace-invite";
import { workspaceMember } from "../schema/workspace-member";
import { workspaceSurvey } from "../schema/workspace-survey";
import { clientRepo } from "./client-repo";
import { workspaceRepo } from "./workspace-repo";

import { clientInviteRepo } from "./client-invite-repo";

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

describe("clientInviteRepo", () => {
  it("create returns the raw token once and persists only the hash", async () => {
    const owner = await makeUser("ci-create");
    const ws = await makeWorkspace(owner.id, "ci-create-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Maya R." });

    const { invite, token } = await clientInviteRepo.create(db, ctx, {
      clientId: c.id,
      email: "maya@example.test",
    });

    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(invite.tokenHash).toBe(hashInviteToken(token));
    // Raw token is never round-tripped; the hash must not equal the
    // plaintext token.
    expect(invite.tokenHash).not.toBe(token);
  });

  it("findByToken returns the invite for a valid token, null otherwise", async () => {
    const owner = await makeUser("ci-find");
    const ws = await makeWorkspace(owner.id, "ci-find-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Devon N." });

    const { invite, token } = await clientInviteRepo.create(db, ctx, {
      clientId: c.id,
      email: "devon@example.test",
    });

    const found = await clientInviteRepo.findByToken(db, token);
    expect(found?.id).toBe(invite.id);

    const missing = await clientInviteRepo.findByToken(db, "definitely-not-a-real-token");
    expect(missing).toBeNull();
  });

  it("findByToken returns null for expired invites", async () => {
    const owner = await makeUser("ci-exp");
    const ws = await makeWorkspace(owner.id, "ci-exp-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Exp" });

    const { token, tokenHash } = generateInviteToken(7);
    // Insert a row by hand with an already-past expiry so we don't have
    // to time-travel inside clientInviteRepo.create.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      await tx.insert(clientInvite).values({
        workspaceId: ws.id,
        clientId: c.id,
        email: "old@example.test",
        tokenHash,
        expiresAt: new Date(Date.now() - 1000),
        invitedBy: owner.id,
      });
    });

    expect(await clientInviteRepo.findByToken(db, token)).toBeNull();
  });

  it("accept consumes the invite, flips client.status to active, and writes an anonymous audit row", async () => {
    const owner = await makeUser("ci-acc");
    const ws = await makeWorkspace(owner.id, "ci-acc-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Acc" });
    expect(c.status).toBe("invited");

    const { invite, token } = await clientInviteRepo.create(db, ctx, {
      clientId: c.id,
      email: "acc@example.test",
    });

    const result = await clientInviteRepo.accept(db, token);
    expect(result?.workspaceId).toBe(ws.id);
    expect(result?.clientId).toBe(c.id);
    // M2.3a: accept also provisions a client_user row that the cookie
    // will bind to. The id is returned so the action layer can sign it
    // into the atn_c cookie.
    expect(result?.clientUserId).toMatch(/^[0-9a-f-]{36}$/);

    // Client is now active.
    const after = await clientRepo.findById(db, ctx, c.id);
    expect(after?.status).toBe("active");

    // Invite is consumed (single-use).
    const second = await clientInviteRepo.accept(db, token);
    expect(second).toBeNull();

    // Anonymous audit row is present with actor_role='client' and
    // actor_user_id=null.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const rows = await tx
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, "client.invite_accept"));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.actorUserId).toBeNull();
      expect(rows[0]?.actorRole).toBe("client");
      expect(rows[0]?.targetId).toBe(c.id);
      const detail = rows[0]?.detail as { invite_id: string; client_user_id: string };
      expect(detail.invite_id).toBe(invite.id);
      expect(detail.client_user_id).toBe(result?.clientUserId);
    });
  });

  it("revoke deletes the row and audits a client.invite_revoke", async () => {
    const owner = await makeUser("ci-rev");
    const ws = await makeWorkspace(owner.id, "ci-rev-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Rev" });

    const { invite, token } = await clientInviteRepo.create(db, ctx, {
      clientId: c.id,
      email: "rev@example.test",
    });

    await clientInviteRepo.revoke(db, ctx, invite.id);

    // Token is no longer redeemable.
    expect(await clientInviteRepo.findByToken(db, token)).toBeNull();

    // Audit row exists; the targetId points at the parent client (the
    // PHI subject), not at the invite row itself.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const rows = await tx
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, "client.invite_revoke"));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.targetId).toBe(c.id);
    });
  });

  it("audit detail email is masked, not full", async () => {
    const owner = await makeUser("ci-mask");
    const ws = await makeWorkspace(owner.id, "ci-mask-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Mask" });

    await clientInviteRepo.create(db, ctx, {
      clientId: c.id,
      email: "secret-leak-canary@example.test",
    });

    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE attuna_app`);
      await tx.execute(sql`SELECT set_config('app.current_workspace_id', ${ws.id}, true)`);
      const rows = await tx.select().from(auditLog).where(eq(auditLog.action, "client.invite"));
      expect(rows).toHaveLength(1);
      const detail = rows[0]?.detail as { email: string };
      expect(detail.email).toBe("s***@example.test");
      // The full string MUST NOT appear in the detail blob.
      const json = JSON.stringify(rows[0]?.detail);
      expect(json.includes("secret-leak-canary")).toBe(false);
    });
  });

  it("listPendingForClient is RLS-application-scoped: hides other workspaces", async () => {
    const ownerA = await makeUser("lp-a");
    const ownerB = await makeUser("lp-b");
    const wsA = await makeWorkspace(ownerA.id, "lp-a-ws");
    const wsB = await makeWorkspace(ownerB.id, "lp-b-ws");
    const cA = await clientRepo.create(db, ownerCtx(wsA.id, ownerA.id), { displayName: "A" });
    const cB = await clientRepo.create(db, ownerCtx(wsB.id, ownerB.id), { displayName: "B" });

    await clientInviteRepo.create(db, ownerCtx(wsA.id, ownerA.id), {
      clientId: cA.id,
      email: "a@example.test",
    });
    await clientInviteRepo.create(db, ownerCtx(wsB.id, ownerB.id), {
      clientId: cB.id,
      email: "b@example.test",
    });

    // Listing from ws-A only returns A's invites — the repo filters by
    // workspace_id at the application layer (the table itself is
    // intentionally not RLS-protected so the anonymous accept path
    // works).
    const listA = await clientInviteRepo.listPendingForClient(
      db,
      { workspaceId: wsA.id, userId: ownerA.id },
      cA.id,
    );
    expect(listA).toHaveLength(1);
    expect(listA[0]?.email).toBe("a@example.test");

    // Trying to read B's invites from A's context returns nothing.
    const cross = await clientInviteRepo.listPendingForClient(
      db,
      { workspaceId: wsA.id, userId: ownerA.id },
      cB.id,
    );
    expect(cross).toEqual([]);
  });

  it("clientRepo.findDisplayNameForInvite resolves without a userId", async () => {
    const owner = await makeUser("dn");
    const ws = await makeWorkspace(owner.id, "dn-ws");
    const ctx = ownerCtx(ws.id, owner.id);
    const c = await clientRepo.create(db, ctx, { displayName: "Pretty Name" });

    const name = await clientRepo.findDisplayNameForInvite(db, ws.id, c.id);
    expect(name).toBe("Pretty Name");

    // Mismatched workspace returns null even with a real client id.
    const ws2Owner = await makeUser("dn2");
    const ws2 = await makeWorkspace(ws2Owner.id, "dn-ws-2");
    const cross = await clientRepo.findDisplayNameForInvite(db, ws2.id, c.id);
    expect(cross).toBeNull();
  });
});
