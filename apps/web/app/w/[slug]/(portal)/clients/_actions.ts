"use server";

import { z } from "zod";

import type { ActionResult } from "@/lib/auth/actions";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

// Phase 2 stub. Phase 4 swaps this for a POST to /api/clients (which
// inserts a `clients` row with encrypted email + name + queues a Postmark
// invite email — see ARCHITECTURE.md). Per HIPAA.md, the invite email's
// subject and body must NOT contain PHI.
export async function inviteClientAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  // Simulate the network round-trip so the loading state is visible.
  await new Promise((r) => setTimeout(r, 600));
  return { ok: true };
}
