"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

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

async function setSession(subject: { sub: string; email: string; name: string }) {
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

  await setSession(result.subject);
  // First-time verified users land on onboarding. Returning users come in via
  // /signin which sends them straight to /today.
  redirect("/onboarding");
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
