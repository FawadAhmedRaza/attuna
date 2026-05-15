// KMS abstraction for envelope-encrypting PHI columns. HIPAA.md §5 is
// the spec: per-row data key, AES-256-GCM, never store plaintext keys,
// real production uses a customer-managed AWS KMS CMK.
//
// `KmsClient` is the interface every encryption path goes through.
// `DevKmsClient` (this file) is a deterministic local stand-in — NOT
// real KMS. It produces wire-shape-correct wrapped keys so the envelope
// helpers, repos, and migrations are identical in dev and prod. When
// the real `AwsKmsClient` lands, the only swap is the factory at the
// bottom of this file.
//
// Fail-closed: in production, `createKmsClient()` throws unless real
// KMS is configured. The dev shim is impossible to ship to prod.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_BYTES = 32; // AES-256
const GCM_NONCE_BYTES = 12;
const GCM_TAG_BYTES = 16;

export interface DataKey {
  /** Plaintext data key — used once for AES-GCM, then discarded. Never persist. */
  readonly plaintext: Buffer;
  /** Wrapped (encrypted-by-KMS) form — safe to store in the row. */
  readonly wrapped: Buffer;
}

export interface KmsClient {
  /** Generate a fresh AES-256 data key. Plaintext is in-memory only. */
  generateDataKey(): Promise<DataKey>;
  /** Unwrap a previously-wrapped key. Plaintext is in-memory only. */
  decryptDataKey(wrapped: Buffer): Promise<Buffer>;
}

// ────────────────────────────────────────────────────────────────────
// Dev shim
// ────────────────────────────────────────────────────────────────────

// Wrap format (dev only): [nonce(12) | ciphertext(32) | tag(16)] = 60 bytes
const WRAPPED_BYTES = GCM_NONCE_BYTES + KEY_BYTES + GCM_TAG_BYTES;

function devMasterKey(): Buffer {
  // Deterministic 32 bytes derived from AUTH_SESSION_SECRET (already
  // present in dev). Using a non-secret hardcoded value would be worse:
  // a tampered .env that drops AUTH_SESSION_SECRET would silently fall
  // through to a known wrap key. With the secret as the seed, missing
  // the secret in prod throws (per session.ts), and in dev the fallback
  // string is used everywhere. Empty string is treated as "missing" —
  // .env.local often has `AUTH_SESSION_SECRET=` which loads as empty.
  const raw = process.env.AUTH_SESSION_SECRET;
  const seed = raw && raw.length > 0 ? raw : "dev-only-fallback-secret-change-me-at-least-32b";
  // Hash-stretch to 32 bytes via SHA-256.
  // (Avoid pulling in a KDF library for a dev shim.)
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(`attuna-dev-kms:${seed}`).digest();
}

class DevKmsClient implements KmsClient {
  async generateDataKey(): Promise<DataKey> {
    const plaintext = randomBytes(KEY_BYTES);
    const nonce = randomBytes(GCM_NONCE_BYTES);
    const cipher = createCipheriv("aes-256-gcm", devMasterKey(), nonce);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { plaintext, wrapped: Buffer.concat([nonce, ciphertext, tag]) };
  }

  async decryptDataKey(wrapped: Buffer): Promise<Buffer> {
    if (wrapped.length !== WRAPPED_BYTES) {
      throw new Error(`DevKMS: wrapped key has wrong length (${wrapped.length})`);
    }
    const nonce = wrapped.subarray(0, GCM_NONCE_BYTES);
    const ciphertext = wrapped.subarray(GCM_NONCE_BYTES, GCM_NONCE_BYTES + KEY_BYTES);
    const tag = wrapped.subarray(GCM_NONCE_BYTES + KEY_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", devMasterKey(), nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

// ────────────────────────────────────────────────────────────────────
// Factory
// ────────────────────────────────────────────────────────────────────

let cached: KmsClient | null = null;

export function createKmsClient(): KmsClient {
  if (cached) return cached;

  const realKeyId = process.env.KMS_KEY_ID_PHI;
  if (process.env.NODE_ENV === "production" && !realKeyId) {
    throw new Error(
      "KMS_KEY_ID_PHI must be set in production. The dev KMS shim cannot ship to prod.",
    );
  }

  if (realKeyId) {
    // Real AWS KMS lives behind this branch — wired in a follow-up commit
    // alongside @aws-sdk/client-kms. Until then, refuse to silently fall
    // back to the dev shim when a key id is present.
    throw new Error(
      "Real AWS KMS not yet wired. Remove KMS_KEY_ID_PHI from env to use the dev shim, or add the SDK.",
    );
  }

  cached = new DevKmsClient();
  return cached;
}

// Internal for tests — never call from app code.
export const __testing = { DevKmsClient, WRAPPED_BYTES, KEY_BYTES };
