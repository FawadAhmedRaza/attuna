"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@attuna/db/client";
import { createKmsClient } from "@attuna/db/lib/kms";
import { entryRepo } from "@attuna/db/repositories/entry-repo";

import { requireClientSession } from "@/lib/auth/require-client";

export type JournalWriteResult =
  | { ok: true; entryId: string; wordCount: number }
  | { ok: false; error: string };

const writeSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a little something before saving")
    .max(10_000, "Entries cap at 10k characters for now"),
  // ISO timestamp from the client. We accept this so offline-captured
  // entries (mobile, M2.3b) carry their original written-at time, but
  // we cap it at 'now' server-side to prevent forged-future dates from
  // skewing brief generation downstream.
  written_at: z.string().datetime().optional(),
});

export async function writeJournalEntryAction(
  _prev: JournalWriteResult | null,
  formData: FormData,
): Promise<JournalWriteResult> {
  const parsed = writeSchema.safeParse({
    body: formData.get("body"),
    written_at: formData.get("written_at") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { body, written_at } = parsed.data;

  const session = await requireClientSession();
  if (!session) {
    return {
      ok: false,
      error: "Your session expired. Re-open the invite link from your therapist.",
    };
  }

  // Cap written_at at server-side now() — disallow forged future
  // timestamps. Defaults to now() if missing.
  const wantedAt = written_at ? new Date(written_at) : new Date();
  const now = new Date();
  const writtenAt = wantedAt.getTime() > now.getTime() ? now : wantedAt;

  const created = await entryRepo.createAsClient(db(), createKmsClient(), session, body, writtenAt);

  // The /j page is the same route for everyone — revalidate it so the
  // post-submit render shows the new entry at the top of the list.
  revalidatePath("/j");
  return { ok: true, entryId: created.id, wordCount: created.wordCount };
}
