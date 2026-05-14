"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@attuna/db/client";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";

import { authClient } from "./client";
import { sessionCookieOptions, signSessionToken, SESSION_COOKIE_NAME } from "./session";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type StepResult = { ok: true; step: "code"; email: string } | { ok: false; error: string };

const emailSchema = z.string().email("Enter a valid email");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
const codeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");
const nameSchema = z.string().trim().min(1, "Enter your name").max(80, "Name is too long");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const verifySchema = z.object({ email: emailSchema, code: codeSchema });
const forgotSchema = z.object({ email: emailSchema });
const resetSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  password: passwordSchema,
});

function fieldError<T extends z.ZodTypeAny>(
  parsed: z.SafeParseReturnType<unknown, z.infer<T>>,
): string {
  if (parsed.success) return "";
  return parsed.error.issues[0]?.message ?? "Invalid input";
}

async function setSession(subject: { sub: string; userId: string; email: string; name: string }) {
  const token = await signSessionToken(subject);
  cookies().set({ ...sessionCookieOptions(), value: token });
}

// ── sign in ────────────────────────────────────────────────────────
export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed) };

  const result = await authClient.signIn(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  await setSession(result.subject);

  // First-time users (no workspace yet) land in onboarding; everyone else
  // honors the `next` param or falls through to /today. We check by DB
  // rather than session because the session JWT doesn't carry workspace
  // membership state.
  const memberOf = await workspaceRepo.listForUser(db(), result.subject.userId);
  if (memberOf.length === 0) {
    redirect("/onboarding");
  }
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/today");
}

// ── sign up ────────────────────────────────────────────────────────
export async function signUpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed) };

  const result = await authClient.signUp(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  redirect(`/verify?email=${encodeURIComponent(parsed.data.email)}`);
}

// ── verify OTP (post-signup) ───────────────────────────────────────
//
// Cognito's ConfirmSignUp doesn't return tokens, and we no longer have the
// user's password at this step (the signup form discarded it). So we mark
// the email verified and send them through the normal sign-in flow. The
// signin page shows a confirmation banner via ?verified=1.
//
// First sign-in after verification mirrors the Cognito user into our `user`
// table; the redirect target there is `/onboarding` for users with no
// workspaces yet (handled in M1 step 3).
export async function verifyOtpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = verifySchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed) };

  const result = await authClient.verifyOtp(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  redirect(`/signin?verified=1&email=${encodeURIComponent(parsed.data.email)}`);
}

export async function resendOtpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: fieldError(parsed) };
  const result = await authClient.resendOtp(parsed.data);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

// ── forgot / reset password ────────────────────────────────────────
export async function forgotPasswordAction(
  _prev: StepResult | null,
  formData: FormData,
): Promise<StepResult> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: fieldError(parsed) };

  const result = await authClient.forgotPassword(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  // Stay on the page — switch to the code+password step.
  return { ok: true, step: "code", email: parsed.data.email };
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed) };

  const result = await authClient.resetPassword(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  redirect("/signin?reset=1");
}

// ── sign out ───────────────────────────────────────────────────────
export async function signOutAction(): Promise<void> {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/");
}
