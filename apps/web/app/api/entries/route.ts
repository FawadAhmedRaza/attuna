// GET /api/entries  — list the caller's own decrypted entries
// POST /api/entries  — write a new entry
//
// Auth: Authorization: Bearer <Cognito ID token>. The bearer resolver
// returns (workspaceId, clientId, clientUserId) that entryRepo's
// client-side methods accept directly. Body bodies decrypt in memory
// only — HIPAA §12 rules out on-device decryption keys.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@attuna/db/client";
import { createKmsClient } from "@attuna/db/lib/kms";
import { entryRepo } from "@attuna/db/repositories/entry-repo";

import { requireClientBearer } from "@/lib/auth/require-client-bearer";

export const runtime = "nodejs";

const writeSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a little something before saving")
    .max(10_000, "Entries cap at 10k characters for now"),
  writtenAt: z.string().datetime().optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await requireClientBearer(req);
  if (!session) return unauthorized();

  const entries = await entryRepo.listAsClient(db(), createKmsClient(), session);
  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      body: e.body,
      wordCount: e.wordCount,
      writtenAt: e.writtenAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireClientBearer(req);
  if (!session) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = writeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Bad request" },
      { status: 400 },
    );
  }

  // Cap writtenAt at server-side now() — disallow forged future
  // timestamps. Matches the /j web action's behaviour.
  const wantedAt = parsed.data.writtenAt ? new Date(parsed.data.writtenAt) : new Date();
  const now = new Date();
  const writtenAt = wantedAt.getTime() > now.getTime() ? now : wantedAt;

  const created = await entryRepo.createAsClient(
    db(),
    createKmsClient(),
    session,
    parsed.data.body,
    writtenAt,
  );
  return NextResponse.json(
    {
      entry: {
        id: created.id,
        body: created.body,
        wordCount: created.wordCount,
        writtenAt: created.writtenAt.toISOString(),
        createdAt: created.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
