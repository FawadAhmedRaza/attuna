// Mobile Cognito wrapper. Wraps amazon-cognito-identity-js (SRP — the
// password never reaches our servers) in promise-based helpers so the
// React screens can `await signIn(...)` cleanly. Used by the sign-up,
// confirm, and sign-in screens.
//
// Env: EXPO_PUBLIC_COGNITO_USER_POOL_ID + EXPO_PUBLIC_COGNITO_CLIENT_ID
// are baked into the bundle at build time. Missing values throw on the
// first call rather than at module load so the welcome screen still
// renders without env config.

import "react-native-get-random-values"; // crypto polyfill for SRP

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";

let cachedPool: CognitoUserPool | null = null;

function getPool(): CognitoUserPool {
  if (cachedPool) return cachedPool;
  const poolId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;
  if (!poolId || !clientId) {
    throw new Error(
      "EXPO_PUBLIC_COGNITO_USER_POOL_ID + EXPO_PUBLIC_COGNITO_CLIENT_ID must be set. " +
        "Run `cdk deploy Attuna-Cognito-Dev` and copy the outputs into apps/mobile/.env.",
    );
  }
  cachedPool = new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId });
  return cachedPool;
}

function userFor(email: string): CognitoUser {
  return new CognitoUser({ Username: email, Pool: getPool() });
}

export async function signUp(email: string, password: string): Promise<void> {
  const pool = getPool();
  await new Promise<void>((resolve, reject) => {
    pool.signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: "email", Value: email })],
      [],
      (err) => {
        if (err) reject(translate(err));
        else resolve();
      },
    );
  });
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    userFor(email).confirmRegistration(code, true, (err) => {
      if (err) reject(translate(err));
      else resolve();
    });
  });
}

export async function resendConfirmationCode(email: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    userFor(email).resendConfirmationCode((err) => {
      if (err) reject(translate(err));
      else resolve();
    });
  });
}

export interface SignInResult {
  /** Cognito ID token — pass to /api/c/link and subsequent API calls. */
  idToken: string;
  /** Cognito sub (user id). Useful for client-side correlation logs. */
  sub: string;
  email: string;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const user = userFor(email);
  return new Promise<SignInResult>((resolve, reject) => {
    user.authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken();
        const payload = idToken.payload as { sub?: string; email?: string };
        if (!payload.sub || !payload.email) {
          reject(new Error("Cognito session missing required claims"));
          return;
        }
        resolve({ idToken: idToken.getJwtToken(), sub: payload.sub, email: payload.email });
      },
      onFailure: (err) => reject(translate(err)),
      newPasswordRequired: () => {
        reject(new Error("New password required — handle in a future slice"));
      },
    });
  });
}

export function signOutCurrent(): void {
  const current = getPool().getCurrentUser();
  current?.signOut();
}

/**
 * Get a fresh ID token from the cached Cognito session (if any).
 * Returns null if there's no signed-in user OR if the refresh fails.
 * The journal screens call this before every API request so we always
 * have a current token.
 */
export async function currentIdToken(): Promise<string | null> {
  const current = getPool().getCurrentUser();
  if (!current) return null;
  return new Promise<string | null>((resolve) => {
    current.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

// Translate Cognito SDK errors into user-safe strings. We never echo
// the raw AWS message because some leak existence info ("user does
// not exist"). HIPAA §11 + the therapist auth client (apps/web/lib/
// auth/client.ts) use the same shape.
function translate(err: unknown): Error {
  if (typeof err !== "object" || err === null) return new Error("Something went wrong. Try again.");
  const name = (err as { name?: string; code?: string }).name ?? (err as { code?: string }).code;
  switch (name) {
    case "UsernameExistsException":
      return new Error("Check your email for a verification code if you just signed up.");
    case "InvalidPasswordException":
      return new Error("Password doesn't meet the requirements.");
    case "CodeMismatchException":
      return new Error("Code is incorrect.");
    case "ExpiredCodeException":
      return new Error("That code has expired. Tap Resend.");
    case "UserNotConfirmedException":
      return new Error("Please verify your email before signing in.");
    case "NotAuthorizedException":
    case "UserNotFoundException":
      return new Error("Invalid email or password.");
    case "LimitExceededException":
      return new Error("Too many attempts. Try again in a few minutes.");
    default:
      return new Error("Sign-in failed. Try again.");
  }
}
