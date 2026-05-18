import { describe, expect, it } from "vitest";

import { generateInviteToken, hashInviteToken, isInviteExpired } from "./invite-token";

describe("invite-token", () => {
  it("generates a unique token, a hex hash, and an expiry in the future", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();

    expect(a.token).not.toEqual(b.token);
    expect(a.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(a.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("never returns the raw token in the hash", () => {
    const { token, tokenHash } = generateInviteToken();
    expect(tokenHash).not.toContain(token);
  });

  it("produces the same hash for the same token (so lookup works)", () => {
    const { token, tokenHash } = generateInviteToken();
    expect(hashInviteToken(token)).toEqual(tokenHash);
  });

  it("honors a custom TTL", () => {
    const { expiresAt } = generateInviteToken(1);
    const oneDayMs = 24 * 60 * 60 * 1000;
    const delta = expiresAt.getTime() - Date.now();
    expect(delta).toBeGreaterThan(oneDayMs - 1000);
    expect(delta).toBeLessThan(oneDayMs + 1000);
  });

  it("considers an invite expired at or past its expiresAt", () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 60_000);
    expect(isInviteExpired(past)).toBe(true);
    expect(isInviteExpired(future)).toBe(false);
  });
});
