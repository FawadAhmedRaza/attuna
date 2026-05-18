"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@attuna/db/client";
import { inviteRepo } from "@attuna/db/repositories/invite-repo";
import { memberRepo } from "@attuna/db/repositories/member-repo";
import { userRepo } from "@attuna/db/repositories/user-repo";
import { invitableRole } from "@attuna/db/schema/workspace-invite";
import { workspaceRole } from "@attuna/db/schema/workspace-member";

import { resolveActionContext } from "@/lib/workspace/require";

export type MembersActionResult =
  | { ok: true; message?: string; inviteUrl?: string }
  | { ok: false; error: string };

const slugSchema = z.string().min(2).max(64);
const emailSchema = z
  .string()
  .email("Enter a valid email")
  .transform((v) => v.trim().toLowerCase());
const inviteSchema = z.object({
  slug: slugSchema,
  email: emailSchema,
  role: z.enum(invitableRole),
});
const userIdSchema = z.string().uuid();

function appUrl(): string {
  // NEXT_PUBLIC_APP_URL is set in dev; falls back so the action doesn't
  // crash in test environments that forgot to set it.
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

// ── invite ─────────────────────────────────────────────────────────
export async function inviteMemberAction(
  _prev: MembersActionResult | null,
  formData: FormData,
): Promise<MembersActionResult> {
  const parsed = inviteSchema.safeParse({
    slug: formData.get("slug"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { slug, email, role } = parsed.data;

  const resolved = await resolveActionContext(slug, { minimumRole: "admin" });
  if (!resolved.ok) return resolved;
  const { ctx, session } = resolved.value;

  // Block invites to people who are already active members.
  const existingUser = await userRepo.findByEmail(db(), email);
  if (existingUser) {
    const member = await memberRepo.findOne(db(), ctx, existingUser.id);
    if (member && member.status === "active") {
      return { ok: false, error: `${email} is already a member.` };
    }
  }

  // Block duplicate pending invites; UI should offer "Resend" instead.
  const pending = await inviteRepo.listPending(db(), ctx);
  if (pending.some((p) => p.email.toLowerCase() === email)) {
    return { ok: false, error: `${email} already has a pending invite. Use Resend to refresh it.` };
  }

  const { token } = await inviteRepo.create(db(), ctx, {
    email,
    role,
    invitedBy: session.userId,
  });

  revalidatePath(`/w/${slug}/settings/members`);
  return {
    ok: true,
    message: `Invited ${email}.`,
    inviteUrl: `${appUrl()}/invite/${token}`,
  };
}

// ── resend ─────────────────────────────────────────────────────────
export async function resendInviteAction(formData: FormData): Promise<MembersActionResult> {
  const slugP = slugSchema.safeParse(formData.get("slug"));
  const idP = z.string().uuid().safeParse(formData.get("invite_id"));
  if (!slugP.success || !idP.success) return { ok: false, error: "Bad request." };
  const slug = slugP.data;

  const resolved = await resolveActionContext(slug, { minimumRole: "admin" });
  if (!resolved.ok) return resolved;
  const { ctx, session } = resolved.value;

  const pending = await inviteRepo.listPending(db(), ctx);
  const target = pending.find((p) => p.id === idP.data);
  if (!target) return { ok: false, error: "That invite no longer exists." };

  await inviteRepo.revoke(db(), ctx, target.id);
  const { token } = await inviteRepo.create(db(), ctx, {
    email: target.email,
    role: target.role,
    invitedBy: session.userId,
  });

  revalidatePath(`/w/${slug}/settings/members`);
  return {
    ok: true,
    message: `Resent invite to ${target.email}.`,
    inviteUrl: `${appUrl()}/invite/${token}`,
  };
}

// ── revoke pending invite ──────────────────────────────────────────
export async function revokeInviteAction(formData: FormData): Promise<MembersActionResult> {
  const slugP = slugSchema.safeParse(formData.get("slug"));
  const idP = z.string().uuid().safeParse(formData.get("invite_id"));
  if (!slugP.success || !idP.success) return { ok: false, error: "Bad request." };
  const slug = slugP.data;

  const resolved = await resolveActionContext(slug, { minimumRole: "admin" });
  if (!resolved.ok) return resolved;

  await inviteRepo.revoke(db(), resolved.value.ctx, idP.data);
  revalidatePath(`/w/${slug}/settings/members`);
  return { ok: true, message: "Invite revoked." };
}

// ── remove member (soft delete) ────────────────────────────────────
export async function removeMemberAction(formData: FormData): Promise<MembersActionResult> {
  const slugP = slugSchema.safeParse(formData.get("slug"));
  const idP = userIdSchema.safeParse(formData.get("user_id"));
  if (!slugP.success || !idP.success) return { ok: false, error: "Bad request." };
  const slug = slugP.data;

  const resolved = await resolveActionContext(slug, { minimumRole: "admin" });
  if (!resolved.ok) return resolved;
  const { ctx, member } = resolved.value;

  if (idP.data === member.userId) {
    return { ok: false, error: "Use Leave workspace to remove yourself." };
  }

  const target = await memberRepo.findOne(db(), ctx, idP.data);
  if (!target || target.status !== "active") {
    return { ok: false, error: "That member isn't active in this workspace." };
  }
  if (target.role === "owner") {
    return { ok: false, error: "The owner can't be removed." };
  }

  await memberRepo.remove(db(), ctx, idP.data);
  revalidatePath(`/w/${slug}/settings/members`);
  return { ok: true, message: "Member removed." };
}

// ── change role ────────────────────────────────────────────────────
const changeRoleSchema = z.object({
  slug: slugSchema,
  user_id: userIdSchema,
  role: z.enum(workspaceRole),
});

export async function changeRoleAction(formData: FormData): Promise<MembersActionResult> {
  const parsed = changeRoleSchema.safeParse({
    slug: formData.get("slug"),
    user_id: formData.get("user_id"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { slug, user_id, role } = parsed.data;

  const resolved = await resolveActionContext(slug, { minimumRole: "admin" });
  if (!resolved.ok) return resolved;
  const { ctx } = resolved.value;

  const target = await memberRepo.findOne(db(), ctx, user_id);
  if (!target || target.status !== "active") {
    return { ok: false, error: "That member isn't active in this workspace." };
  }
  if (target.role === "owner" || role === "owner") {
    // Owner transfer isn't supported in M1 — ROADMAP defers it.
    return { ok: false, error: "Ownership can't be transferred yet." };
  }

  await memberRepo.changeRole(db(), ctx, user_id, role);
  revalidatePath(`/w/${slug}/settings/members`);
  return { ok: true, message: "Role updated." };
}

// ── leave workspace (self-removal) ─────────────────────────────────
export async function leaveWorkspaceAction(formData: FormData): Promise<MembersActionResult> {
  const slugP = slugSchema.safeParse(formData.get("slug"));
  if (!slugP.success) return { ok: false, error: "Bad request." };
  const slug = slugP.data;

  const resolved = await resolveActionContext(slug);
  if (!resolved.ok) return resolved;
  const { ctx, member, session } = resolved.value;

  if (member.role === "owner") {
    return {
      ok: false,
      error: "The owner can't leave. Transfer ownership first (coming soon).",
    };
  }

  await memberRepo.remove(db(), ctx, session.userId);
  // After leaving, the user has lost access to this workspace. Send them
  // home so the marketing redirect can route to another workspace (or
  // /onboarding if they have none).
  redirect("/");
}
