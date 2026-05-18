"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@attuna/db/client";
import { clientRepo } from "@attuna/db/repositories/client-repo";

import { resolveActionContext } from "@/lib/workspace/require";

export type ClientActionResult =
  | { ok: true; clientId?: string; message?: string }
  | { ok: false; error: string };

const slugSchema = z.string().min(2).max(64);
const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name or initials")
  .max(80, "Keep it under 80 characters");
const inviteEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email")
  .optional()
  .or(z.literal("").transform(() => undefined));

const createSchema = z.object({
  slug: slugSchema,
  display_name: displayNameSchema,
  invite_email: inviteEmailSchema,
});

// Create a client. Any active workspace member can call this — the action
// layer doesn't enforce a role beyond "must be a member" here. If we later
// want clinic admins to gate creation, add { minimumRole: "admin" } below.
export async function createClientAction(
  _prev: ClientActionResult | null,
  formData: FormData,
): Promise<ClientActionResult> {
  const parsed = createSchema.safeParse({
    slug: formData.get("slug"),
    display_name: formData.get("display_name"),
    invite_email: formData.get("invite_email") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { slug, display_name, invite_email } = parsed.data;

  const resolved = await resolveActionContext(slug);
  if (!resolved.ok) return resolved;
  const { ctx, member } = resolved.value;

  const created = await clientRepo.create(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId, role: member.role },
    {
      displayName: display_name,
      inviteEmail: invite_email ?? null,
    },
  );

  revalidatePath(`/w/${slug}/clients`);
  return {
    ok: true,
    clientId: created.id,
    message: `Added ${display_name}.`,
  };
}
