// Server-side verification of a Cognito-issued ID token. Used by
// `/api/c/link` (M2.3b.3) and every authenticated mobile request
// thereafter — Authorization: Bearer <id_token>.
//
// jose's createRemoteJWKSet handles JWKS fetching + caching + key
// rotation. We pin verification to:
//   • signature against the live JWKS for our pool
//   • issuer = the canonical Cognito issuer URL
//   • token_use = "id"  (NOT "access" — those have a different audience)
//   • aud = our client id  (so a token meant for a different app
//                            in the same pool can't be replayed at us)
//
// HIPAA §11/§12 note: this code path runs for every PHI-touching
// request from the mobile app. Throw-on-fail keeps the API
// fail-closed — a malformed or stale token returns 401 from the
// route handler, never a partial-success.

import "server-only";

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export interface CognitoIdClaims {
  /** Cognito user id. Stable for the life of the account. */
  readonly sub: string;
  /** Email confirmed by Cognito. */
  readonly email: string;
  /** Custom claim — populated AFTER /api/c/link runs once. NULL on
   *  the first link request; the route handler treats either case as
   *  acceptable, since /api/c/link is the operation that sets it. */
  readonly clientUserId: string | null;
}

export class CognitoTokenError extends Error {
  constructor(
    message: string,
    readonly reason: "missing_config" | "verify_failed" | "wrong_use" | "missing_claim",
  ) {
    super(message);
    this.name = "CognitoTokenError";
  }
}

function poolConfig(): { region: string; poolId: string; clientId: string; issuer: string } {
  const region = process.env.AWS_REGION;
  const poolId = process.env.COGNITO_USER_POOL_ID_CLIENT;
  const clientId = process.env.COGNITO_CLIENT_ID_CLIENT;
  if (!region || !poolId || !clientId) {
    throw new CognitoTokenError(
      "AWS_REGION / COGNITO_USER_POOL_ID_CLIENT / COGNITO_CLIENT_ID_CLIENT must be set",
      "missing_config",
    );
  }
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${poolId}`;
  return { region, poolId, clientId, issuer };
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJwksFor: string | null = null;

function getJwks() {
  const { issuer } = poolConfig();
  if (cachedJwks && cachedJwksFor === issuer) return cachedJwks;
  cachedJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  cachedJwksFor = issuer;
  return cachedJwks;
}

export async function verifyCognitoIdToken(token: string): Promise<CognitoIdClaims> {
  const { issuer, clientId } = poolConfig();
  const jwks = getJwks();

  let payload: JWTPayload;
  try {
    const result = await jwtVerify(token, jwks, {
      issuer,
      audience: clientId,
    });
    payload = result.payload;
  } catch (err) {
    throw new CognitoTokenError(
      `Failed to verify Cognito ID token: ${(err as Error).message}`,
      "verify_failed",
    );
  }

  if (payload["token_use"] !== "id") {
    throw new CognitoTokenError(
      "Token is not an ID token (token_use != 'id'). Use the ID token from CognitoUserSession.getIdToken().",
      "wrong_use",
    );
  }

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new CognitoTokenError("ID token has no `sub` claim", "missing_claim");
  }
  if (typeof payload["email"] !== "string" || !payload["email"]) {
    throw new CognitoTokenError("ID token has no `email` claim", "missing_claim");
  }

  const rawCustom = payload["custom:client_user_id"];
  const clientUserId = typeof rawCustom === "string" && rawCustom.length === 36 ? rawCustom : null;

  return {
    sub: payload.sub,
    email: payload["email"] as string,
    clientUserId,
  };
}
