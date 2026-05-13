import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../client";
import type { Database } from "../context";
import { user } from "../schema/user";
import { workspace } from "../schema/workspace";
import { workspaceInvite } from "../schema/workspace-invite";
import { workspaceMember } from "../schema/workspace-member";
import { generateInviteToken } from "../lib/invite-token";
import { inviteRepo } from "./invite-repo";
import { memberRepo } from "./member-repo";
import { workspaceRepo } from "./workspace-repo";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "..", "..", "migrations");

let db: Database;
let client: Awaited<ReturnType<typeof createDb>>["client"];

beforeAll(async () => {
  const created = createDb(process.env.DATABASE_URL);
  db = created.db;
  client = created.client;
  await migrate(db, { migrationsFolder });
});

afterAll(async () => {
  await client.end();
});

beforeEach(async () => {
  await db.delete(workspaceInvite);
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

describe("workspaceRepo", () => {
  it("creates a workspace and seats the owner", async () => {
    const owner = await makeUser("owner");
    const ws = await workspaceRepo.create(db, {
      slug: "calm-practice",
      name: "Calm Practice",
      ownerId: owner.id,
    });
    expect(ws.slug).toBe("calm-practice");

    const ctx = { userId: owner.id, workspaceId: ws.id };
    const seat = await memberRepo.findOne(db, ctx, owner.id);
    expect(seat?.role).toBe("owner");
    expect(seat?.status).toBe("active");
  });

  it("treats slug uniqueness as case-insensitive (citext)", async () => {
    const owner = await makeUser("dup");
    await workspaceRepo.create(db, {
      slug: "northstar",
      name: "Northstar",
      ownerId: owner.id,
    });
    await expect(
      workspaceRepo.create(db, {
        slug: "NorthStar",
        name: "Dup",
        ownerId: owner.id,
      }),
    ).rejects.toThrow();
  });

  it("lists only workspaces the user is an active member of", async () => {
    const a = await makeUser("a");
    const b = await makeUser("b");

    const aws = await workspaceRepo.create(db, { slug: "a-ws", name: "A", ownerId: a.id });
    await workspaceRepo.create(db, { slug: "b-ws", name: "B", ownerId: b.id });

    const aList = await workspaceRepo.listForUser(db, a.id);
    expect(aList.map((w) => w.id)).toEqual([aws.id]);
  });

  it("reports slug availability", async () => {
    const owner = await makeUser("slug");
    await workspaceRepo.create(db, { slug: "taken", name: "T", ownerId: owner.id });
    expect(await workspaceRepo.isSlugAvailable(db, "taken")).toBe(false);
    expect(await workspaceRepo.isSlugAvailable(db, "TAKEN")).toBe(false);
    expect(await workspaceRepo.isSlugAvailable(db, "free")).toBe(true);
  });
});

describe("inviteRepo", () => {
  it("creates an invite, returns the raw token once, and finds it by token", async () => {
    const owner = await makeUser("inv-owner");
    const ws = await workspaceRepo.create(db, {
      slug: "invitees",
      name: "I",
      ownerId: owner.id,
    });
    const ctx = { userId: owner.id, workspaceId: ws.id };
    const { invite, token } = await inviteRepo.create(db, ctx, {
      email: "new@example.test",
      role: "clinician",
      invitedBy: owner.id,
    });
    expect(invite.tokenHash).not.toEqual(token);

    const found = await inviteRepo.findByToken(db, token);
    expect(found?.id).toEqual(invite.id);
  });

  it("returns null for expired invites", async () => {
    const owner = await makeUser("exp-owner");
    const ws = await workspaceRepo.create(db, {
      slug: "expiry",
      name: "E",
      ownerId: owner.id,
    });
    const ctx = { userId: owner.id, workspaceId: ws.id };
    const { token, tokenHash } = generateInviteToken(7);
    await db.insert(workspaceInvite).values({
      workspaceId: ctx.workspaceId,
      email: "stale@example.test",
      role: "clinician",
      tokenHash,
      expiresAt: new Date(Date.now() - 1000),
      invitedBy: owner.id,
    });

    expect(await inviteRepo.findByToken(db, token)).toBeNull();
  });

  it("returns null for accepted invites", async () => {
    const owner = await makeUser("acc-owner");
    const ws = await workspaceRepo.create(db, {
      slug: "accepted",
      name: "A",
      ownerId: owner.id,
    });
    const ctx = { userId: owner.id, workspaceId: ws.id };
    const { invite, token } = await inviteRepo.create(db, ctx, {
      email: "done@example.test",
      role: "admin",
      invitedBy: owner.id,
    });
    await inviteRepo.markAccepted(db, invite.id);
    expect(await inviteRepo.findByToken(db, token)).toBeNull();
  });
});
