// AES-256-GCM envelope encryption for PHI columns. HIPAA.md §5 is the
// spec: per-row data key issued by KMS, used once to encrypt the
// plaintext, then the wrapped key is stored alongside the ciphertext.
//
// AAD (Additional Authenticated Data) is required on every call. The AAD
// is not encrypted but is authenticated — tampering with it (or moving a
// ciphertext to a different row) fails decryption. For `entry.body` the
// caller builds it as `entry:{workspaceId}:{clientId}:{entryId}` so a
// ciphertext stolen from one row can't be silently grafted onto another.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { KmsClient } from "./kms";

const ALG = "aes-256-gcm";
const NONCE_BYTES = 12;

export interface EnvelopeCiphertext {
  readonly ciphertext: Buffer;
  readonly nonce: Buffer;
  readonly wrappedKey: Buffer;
}

export async function encryptEnvelope(
  kms: KmsClient,
  plaintext: string,
  aad: string,
): Promise<EnvelopeCiphertext> {
  const { plaintext: dataKey, wrapped } = await kms.generateDataKey();
  try {
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv(ALG, dataKey, nonce);
    cipher.setAAD(Buffer.from(aad, "utf8"));
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Store ciphertext + tag concatenated; nonce + wrappedKey live in
    // separate columns for clarity in admin SQL queries.
    return {
      ciphertext: Buffer.concat([enc, tag]),
      nonce,
      wrappedKey: wrapped,
    };
  } finally {
    // Best-effort scrub of the plaintext data key buffer. Node doesn't
    // give us a way to truly zero memory, but overwriting drops it from
    // the live buffer object before GC.
    dataKey.fill(0);
  }
}

export async function decryptEnvelope(
  kms: KmsClient,
  envelope: EnvelopeCiphertext,
  aad: string,
): Promise<string> {
  const dataKey = await kms.decryptDataKey(envelope.wrappedKey);
  try {
    if (envelope.ciphertext.length < 16) {
      throw new Error("Envelope ciphertext too short to contain GCM tag");
    }
    const tagStart = envelope.ciphertext.length - 16;
    const enc = envelope.ciphertext.subarray(0, tagStart);
    const tag = envelope.ciphertext.subarray(tagStart);
    const decipher = createDecipheriv(ALG, dataKey, envelope.nonce);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return plain.toString("utf8");
  } finally {
    dataKey.fill(0);
  }
}

/**
 * Canonical AAD format for entry bodies. Keep this in lockstep with how
 * `entryRepo` builds the AAD — any drift between writer and reader will
 * fail decryption (which is the point).
 */
export function entryAad(workspaceId: string, clientId: string, entryId: string): string {
  return `entry:${workspaceId}:${clientId}:${entryId}`;
}
