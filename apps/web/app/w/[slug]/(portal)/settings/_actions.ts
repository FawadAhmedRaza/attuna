"use server";

import { z } from "zod";

import type { ActionResult } from "@/lib/auth/actions";

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "New password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

// Phase 2 stub. Phase 2 acceptance has Cognito wired; this becomes a real
// AdminSetUserPassword/ChangePassword call there.
export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await new Promise((r) => setTimeout(r, 500));
  return { ok: true };
}
