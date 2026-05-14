import { jwtVerify, SignJWT } from "jose";

export type AuthSession = {
  /** Cognito user UUID (also the JWT `sub`). Stable across email changes. */
  sub: string;
  /** Our DB user.id — what every repo and audit log keys on. */
  userId: string;
  email: string;
  name: string;
  exp: number;
};

const COOKIE_NAME = "attuna_session";
const ALG = "HS256";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h — short for dev

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SESSION_SECRET must be set in production");
    }
    return new TextEncoder().encode("dev-only-fallback-secret-change-me-at-least-32b");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(input: Omit<AuthSession, "exp">): Promise<string> {
  return new SignJWT({ email: input.email, name: input.name, userId: input.userId })
    .setProtectedHeader({ alg: ALG })
    .setSubject(input.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
