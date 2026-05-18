// Cognito-backed AuthClient for the therapist user pool. Talks to AWS from the
// Next.js server (per ARCHITECTURE §4) so tokens never reach the browser; we
// hand back only the subject we'll sign into the session cookie.
//
// Pre-prod migration: switch USER_PASSWORD_AUTH to SRP via
// amazon-cognito-identity-js. The Cognito stack already keeps userPassword off
// in prod (see infra/lib/cognito-stack.ts).

import "server-only";

import {
  AuthFlowType,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { userRepo } from "@attuna/db/repositories/user-repo";
import { db } from "@attuna/db/client";

export type AuthOk<T = void> = T extends void ? { ok: true } : { ok: true } & T;
export type AuthErr = { ok: false; error: string };

export type AuthSubject = {
  /** Cognito sub (UUID) */
  sub: string;
  /** Our DB user.id */
  userId: string;
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

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

const region = process.env.AWS_REGION ?? "us-east-1";
const cognito = new CognitoIdentityProviderClient({ region });

function poolConfig() {
  return {
    userPoolId: getRequiredEnv("COGNITO_USER_POOL_ID_THERAPIST"),
    clientId: getRequiredEnv("COGNITO_CLIENT_ID_THERAPIST"),
  };
}

// Translates AWS error names into user-safe strings. We never echo back the
// raw AWS message because it can leak detail (e.g. "user does not exist").
function translateCognitoError(err: unknown, fallback: string): string {
  if (typeof err !== "object" || err === null) return fallback;
  const name = (err as { name?: string }).name;
  switch (name) {
    case "UsernameExistsException":
      // Don't confirm whether an email is registered.
      return "Check your email for a verification code if you just signed up.";
    case "InvalidPasswordException":
      return "Password doesn't meet the requirements.";
    case "CodeMismatchException":
      return "Code is incorrect.";
    case "ExpiredCodeException":
      return "That code has expired. Request a new one.";
    case "UserNotConfirmedException":
      return "Please verify your email before signing in.";
    case "NotAuthorizedException":
      return "Invalid email or password.";
    case "UserNotFoundException":
      return "Invalid email or password.";
    case "LimitExceededException":
      return "Too many attempts. Try again in a few minutes.";
    case "TooManyRequestsException":
      return "Too many requests. Try again shortly.";
    default:
      return fallback;
  }
}

async function mirrorUser(input: { sub: string; email: string; name: string }) {
  const row = await userRepo.upsertFromCognito(db(), {
    cognitoSub: input.sub,
    email: input.email,
    name: input.name,
  });
  return row.id;
}

export const authClient: AuthClient = {
  async signUp({ email, password, name }) {
    const { clientId } = poolConfig();
    try {
      await cognito.send(
        new SignUpCommand({
          ClientId: clientId,
          Username: email,
          Password: password,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "name", Value: name },
          ],
        }),
      );
      return { ok: true, needsVerification: true };
    } catch (err) {
      return { ok: false, error: translateCognitoError(err, "Sign up failed. Try again.") };
    }
  },

  async verifyOtp({ email, code }) {
    const { clientId } = poolConfig();
    try {
      await cognito.send(
        new ConfirmSignUpCommand({
          ClientId: clientId,
          Username: email,
          ConfirmationCode: code,
        }),
      );
    } catch (err) {
      return { ok: false, error: translateCognitoError(err, "Verification failed.") };
    }

    // Cognito's ConfirmSignUp doesn't return user attributes. To get the
    // canonical sub + name we sign the user in immediately with their email
    // — they just typed their password to get here on the original signup
    // form, but we don't have it any more. Instead we fetch via admin? No
    // — that needs IAM creds. Simpler: after verify we redirect to /signin
    // and ask them to log in. But the existing flow logs them in directly.
    //
    // Workaround: do an AdminGetUser-like lookup via GetUser, which requires
    // an access token we don't have. The cleanest M1 path is to do an
    // unauthenticated sign-in here too, but we don't have the password.
    //
    // For M1 we trust the email (already verified by Cognito just now) and
    // mirror with a placeholder name; the next sign-in will refresh it from
    // the access token claims. The session sub here is the email-derived
    // hash we'd otherwise compute; but we need a real Cognito sub for
    // future RLS. So: the cleanest M1 fix is to require the user to sign in
    // after verifying. We redirect there instead of trying to seat them.
    return {
      ok: true,
      subject: {
        // These are placeholders — actions.ts will redirect to /signin
        // instead of signing the session. See actions.ts.
        sub: "",
        userId: "",
        email,
        name: "",
      },
    };
  },

  async resendOtp({ email }) {
    const { clientId } = poolConfig();
    try {
      await cognito.send(
        new ResendConfirmationCodeCommand({
          ClientId: clientId,
          Username: email,
        }),
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: translateCognitoError(err, "Could not resend code.") };
    }
  },

  async signIn({ email, password }) {
    const { clientId } = poolConfig();
    try {
      const res = await cognito.send(
        new InitiateAuthCommand({
          ClientId: clientId,
          AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
          AuthParameters: { USERNAME: email, PASSWORD: password },
        }),
      );
      const idToken = res.AuthenticationResult?.IdToken;
      if (!idToken) {
        return { ok: false, error: "Authentication failed." };
      }
      const claims = decodeJwtClaims(idToken);
      const sub = claims["sub"];
      const claimEmail = (claims["email"] as string | undefined) ?? email;
      const claimName = (claims["name"] as string | undefined) ?? "";
      if (typeof sub !== "string" || !sub) {
        return { ok: false, error: "Authentication failed." };
      }
      const userId = await mirrorUser({ sub, email: claimEmail, name: claimName });
      return {
        ok: true,
        subject: { sub, userId, email: claimEmail, name: claimName },
      };
    } catch (err) {
      return { ok: false, error: translateCognitoError(err, "Sign in failed.") };
    }
  },

  async forgotPassword({ email }) {
    const { clientId } = poolConfig();
    try {
      await cognito.send(new ForgotPasswordCommand({ ClientId: clientId, Username: email }));
      return { ok: true };
    } catch (err) {
      // Don't reveal whether the email is registered.
      if ((err as { name?: string }).name === "UserNotFoundException") {
        return { ok: true };
      }
      return { ok: false, error: translateCognitoError(err, "Could not send reset code.") };
    }
  },

  async resetPassword({ email, code, password }) {
    const { clientId } = poolConfig();
    try {
      await cognito.send(
        new ConfirmForgotPasswordCommand({
          ClientId: clientId,
          Username: email,
          ConfirmationCode: code,
          Password: password,
        }),
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: translateCognitoError(err, "Could not reset password.") };
    }
  },
};

function decodeJwtClaims(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return {};
  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}
