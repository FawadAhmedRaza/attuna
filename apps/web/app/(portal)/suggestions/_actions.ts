"use server";

import { z } from "zod";

import type { ActionResult } from "@/lib/auth/actions";

const schema = z.object({
  title: z.string().trim().min(1, "Give it a title").max(80, "Title is too long"),
  body: z
    .string()
    .trim()
    .min(8, "A few more words helps clients respond")
    .max(400, "Keep it under 400 characters — short prompts feel calmer"),
});

// Phase 2 stub. Phase 8 inserts into `suggestions` table per ARCHITECTURE.md.
export async function createSuggestionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await new Promise((r) => setTimeout(r, 500));
  return { ok: true };
}

const updateSchema = schema.extend({ id: z.string().min(1) });

// Phase 2 stub. Phase 8 issues a PATCH /suggestions/:id (with audit_log entry
// per HIPAA.md — even therapist-content edits are logged).
export async function updateSuggestionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await new Promise((r) => setTimeout(r, 500));
  return { ok: true };
}
