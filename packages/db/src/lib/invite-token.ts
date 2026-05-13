import { createHash, randomBytes } from "node:crypto";

/**
 * Tokens are 32 bytes of CSPRNG output, base64url-encoded → 43 chars.
 * The raw token is shown to the invitee once (in the email link) and
 * never stored. We persist only the SHA-256 hash so a DB dump cannot
 * be used to accept invites.
 */
const TOKEN_BYTES = 32;
const DEFAULT_TTL_DAYS = 7;

export interface GeneratedInviteToken {
  readonly token: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
}

export function generateInviteToken(ttlDays = DEFAULT_TTL_DAYS): GeneratedInviteToken {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  return { token, tokenHash: hashInviteToken(token), expiresAt };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isInviteExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
