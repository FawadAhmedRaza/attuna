// Journal entries — the most sensitive PHI we hold. Every create
// envelope-encrypts the body before it touches Postgres; every read
// decrypts after RLS has already proven the caller is allowed to see
// the row. Audit rows for both operations land in the same transaction
// as the data op (HIPAA.md §6).
//
// Clinician isolation is enforced via the parent `client` row: we look
// up the client through clientRepo.findById first, which respects the
// clinician-scoped filter. If the client isn't visible, we never touch
// the entry table.

import { asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuditContext, Database } from "../context";
import { withWorkspaceContext } from "../context";
import { decryptEnvelope, encryptEnvelope, entryAad } from "../lib/envelope";
import type { KmsClient } from "../lib/kms";
import { entry as entryTable, type Entry } from "../schema/entry";

import { auditRepo } from "./audit-repo";
import { clientRepo } from "./client-repo";

export interface CreateEntryInput {
  readonly clientId: string;
  readonly body: string;
  readonly writtenAt: Date;
}

export interface DecryptedEntry {
  readonly id: string;
  readonly clientId: string;
  readonly body: string;
  readonly wordCount: number;
  readonly writtenAt: Date;
  readonly createdAt: Date;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function toDecrypted(row: Entry, body: string): DecryptedEntry {
  return {
    id: row.id,
    clientId: row.clientId,
    body,
    wordCount: row.wordCount,
    writtenAt: row.writtenAt,
    createdAt: row.createdAt,
  };
}

export const entryRepo = {
  /**
   * Create a journal entry. The body is encrypted before it crosses
   * into Postgres; we pre-generate the entry UUID so the AAD can bind
   * the ciphertext to the exact row in a single INSERT.
   *
   * Authorization: the caller must be able to "see" the parent client
   * via clientRepo.findById (which enforces RLS + clinician isolation).
   * If the client is not visible we return null without touching the
   * entry table.
   */
  async create(
    db: Database,
    ctx: AuditContext,
    kms: KmsClient,
    input: CreateEntryInput,
  ): Promise<DecryptedEntry | null> {
    // We check visibility first via clientRepo so a clinician can't
    // write entries for clients they aren't assigned to. The check
    // itself audits a `client.read` event, which is the right trail
    // for "who tried to attach data to whom".
    const parent = await clientRepo.findById(db, ctx, input.clientId);
    if (!parent) {
      return null;
    }

    const entryId = randomUUID();
    const aad = entryAad(ctx.workspaceId, input.clientId, entryId);
    const enc = await encryptEnvelope(kms, input.body, aad);
    const wordCount = countWords(input.body);
    const writtenAt = input.writtenAt;

    return withWorkspaceContext(db, ctx, async (tx) => {
      const [created] = await tx
        .insert(entryTable)
        .values({
          id: entryId,
          workspaceId: ctx.workspaceId,
          clientId: input.clientId,
          bodyCiphertext: enc.ciphertext,
          bodyNonce: enc.nonce,
          bodyWrappedKey: enc.wrappedKey,
          bodyAad: aad,
          wordCount,
          writtenAt,
        })
        .returning();
      if (!created) {
        throw new Error("Failed to insert entry");
      }
      await auditRepo.writeInTx(tx, ctx, {
        action: "entry.create",
        targetType: "entry",
        targetId: created.id,
        detail: { client_id: input.clientId, word_count: wordCount },
      });
      return toDecrypted(created, input.body);
    });
  },

  /**
   * List + decrypt entries for a client, newest first. Returns an empty
   * array if the caller can't see the parent client (RLS or clinician
   * scope) — matches `findById` semantics.
   */
  async listForClient(
    db: Database,
    ctx: AuditContext,
    kms: KmsClient,
    clientId: string,
  ): Promise<DecryptedEntry[]> {
    const parent = await clientRepo.findById(db, ctx, clientId);
    if (!parent) {
      return [];
    }

    const rows = await withWorkspaceContext(db, ctx, async (tx) => {
      const r = await tx
        .select()
        .from(entryTable)
        .where(eq(entryTable.clientId, clientId))
        .orderBy(asc(entryTable.writtenAt));
      await auditRepo.writeInTx(tx, ctx, {
        action: "entry.list",
        targetType: "entry",
        detail: { client_id: clientId, count: r.length },
      });
      return r;
    });

    // Decrypt outside the tx — KMS is the slow leg, no point holding
    // a Postgres connection while we wait. The rows themselves are
    // already RLS-screened so revealing them post-tx is safe.
    const decrypted = await Promise.all(
      rows.map(async (row) => {
        const body = await decryptEnvelope(
          kms,
          {
            ciphertext: row.bodyCiphertext,
            nonce: row.bodyNonce,
            wrappedKey: row.bodyWrappedKey,
          },
          row.bodyAad,
        );
        return toDecrypted(row, body);
      }),
    );

    // Sort by writtenAt descending — the SQL got ASC for index-friendly
    // sequential reads of the GCM tags, but the consumer wants newest first.
    decrypted.sort((a, b) => b.writtenAt.getTime() - a.writtenAt.getTime());
    return decrypted;
  },

  /**
   * Single-entry read. Same authorization model as listForClient.
   */
  async findById(
    db: Database,
    ctx: AuditContext,
    kms: KmsClient,
    entryId: string,
  ): Promise<DecryptedEntry | null> {
    const row = await withWorkspaceContext(db, ctx, async (tx) => {
      const rows = await tx.select().from(entryTable).where(eq(entryTable.id, entryId)).limit(1);
      const found = rows[0] ?? null;
      await auditRepo.writeInTx(tx, ctx, {
        action: "entry.read",
        targetType: "entry",
        targetId: entryId,
        detail: found ? null : { result: "not_found_or_forbidden" },
      });
      return found;
    });
    if (!row) return null;

    // Re-apply clinician isolation here. RLS only gated workspace; if a
    // clinician guesses an entry id for a non-assigned client the row
    // would still come back. Check via clientRepo.
    const parent = await clientRepo.findById(db, ctx, row.clientId);
    if (!parent) return null;

    const body = await decryptEnvelope(
      kms,
      {
        ciphertext: row.bodyCiphertext,
        nonce: row.bodyNonce,
        wrappedKey: row.bodyWrappedKey,
      },
      row.bodyAad,
    );
    return toDecrypted(row, body);
  },
};
