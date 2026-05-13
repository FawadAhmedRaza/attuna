// Auth client interface. The dev stub below is what runs locally.
// When Cognito is wired (Phase 2 acceptance), swap the export to a real
// implementation backed by `@aws-sdk/client-cognito-identity-provider`.
//
// Per HIPAA.md: this stub MUST NOT ship to production. The runtime check in
// session.ts (AUTH_SESSION_SECRET required in prod) is the safety net; the
// real Cognito client is the actual fix.

import "server-only";

export type AuthOk<T = void> = T extends void ? { ok: true } : { ok: true } & T;
export type AuthErr = { ok: false; error: string };

export type AuthSubject = {
  sub: string;
  email: string;
  name: string;
};

export interface AuthClient {
  signUp(input: {
    email: string;
    password: string;
    name: string;
  }): Promise<AuthOk<{ needsVerification: true }> | AuthErr>;

  verifyOtp(input: {
    email: string;
    code: string;
  }): Promise<AuthOk<{ subject: AuthSubject }> | AuthErr>;

  resendOtp(input: { email: string }): Promise<AuthOk | AuthErr>;

  signIn(input: {
    email: string;
    password: string;
  }): Promise<AuthOk<{ subject: AuthSubject }> | AuthErr>;

  forgotPassword(input: { email: string }): Promise<AuthOk | AuthErr>;

  resetPassword(input: {
    email: string;
    code: string;
    password: string;
  }): Promise<AuthOk | AuthErr>;
}

// ────────────────────────────────────────────────────────────────────────
// Dev stub: accepts any password >= 8 chars; OTP "123456" always works.
// ────────────────────────────────────────────────────────────────────────

let warned = false;
function warnDevStub() {
  if (warned) return;
  warned = true;
  // Visible in server logs at boot. Cannot ship to prod (AUTH_SESSION_SECRET
  // is required there).
  console.warn("[auth] Using DEV STUB. Replace with Cognito client before any PHI is handled.");
}

const stableSubFromEmail = (email: string): string => {
  // Stable fake UUID derived from email for dev only.
  const normalized = email.trim().toLowerCase();
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `00000000-${hex.slice(0, 4)}-4000-8000-${hex}${"0".repeat(4)}`;
};

const nameFromEmail = (email: string): string => {
  const local = email.split("@")[0] ?? "Friend";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

const devClient: AuthClient = {
  async signUp({ email, password }) {
    warnDevStub();
    if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
    return { ok: true, needsVerification: true };
  },

  async verifyOtp({ email, code }) {
    warnDevStub();
    if (code !== "123456") return { ok: false, error: "Code is incorrect" };
    return {
      ok: true,
      subject: { sub: stableSubFromEmail(email), email, name: nameFromEmail(email) },
    };
  },

  async resendOtp() {
    warnDevStub();
    return { ok: true };
  },

  async signIn({ email, password }) {
    warnDevStub();
    if (password.length < 8) return { ok: false, error: "Invalid email or password" };
    return {
      ok: true,
      subject: { sub: stableSubFromEmail(email), email, name: nameFromEmail(email) },
    };
  },

  async forgotPassword() {
    warnDevStub();
    return { ok: true };
  },

  async resetPassword({ password }) {
    warnDevStub();
    if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
    return { ok: true };
  },
};

export const authClient: AuthClient = devClient;
