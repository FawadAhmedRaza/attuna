"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@attuna/db/client";
import { clientInviteRepo } from "@attuna/db/repositories/client-invite-repo";
import { clientRepo } from "@attuna/db/repositories/client-repo";

import { resolveActionContext } from "@/lib/workspace/require";

export type InviteActionResult =
  | { ok: true; inviteUrl?: string; message?: string }
  | { ok: false; error: string };

const slugSchema = z.string().min(2).max(64);
const clientIdSchema = z.string().uuid();
const emailSchema = z.string().trim().toLowerCase().pipe(z.string().email("Enter a valid email"));
const inviteIdSchema = z.string().uuid();

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

function inviteUrl(token: string): string {
  return `${appUrl()}/c/${token}`;
}

const inviteSchema = z.object({
  slug: slugSchema,
  client_id: clientIdSchema,
  email: emailSchema,
});

export async function inviteClientToJournalAction(
  _prev: InviteActionResult | null,
  formData: FormData,
): Promise<InviteActionResult> {
  const parsed = inviteSchema.safeParse({
    slug: formData.get("slug"),
    client_id: formData.get("client_id"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { slug, client_id, email } = parsed.data;

  const resolved = await resolveActionContext(slug);
  if (!resolved.ok) return resolved;
  const { ctx, member } = resolved.value;

  // Confirm visibility of the parent client through clientRepo —
  // applies clinician isolation and writes its own client.read audit.
  // A clinician inviting on a client they aren't assigned to: no-op
  // with a "not found" error, same as a stale URL.
  const parent = await clientRepo.findById(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId, role: member.role },
    client_id,
  );
  if (!parent) {
    return { ok: false, error: "Client not found." };
  }

  // Block duplicate pending invites; UI surfaces Resend as the path.
  const pending = await clientInviteRepo.listPendingForClient(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId },
    client_id,
  );
  const stillPending = pending.find((p) => !p.acceptedAt);
  if (stillPending) {
    return {
      ok: false,
      error: "An invite for this client is already pending. Resend or revoke it first.",
    };
  }

  const { token } = await clientInviteRepo.create(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId, role: member.role },
    { clientId: client_id, email },
  );

  revalidatePath(`/w/${slug}/clients/${client_id}`);
  return {
    ok: true,
    message: `Invite created for ${email}.`,
    inviteUrl: inviteUrl(token),
  };
}

const resendSchema = z.object({
  slug: slugSchema,
  client_id: clientIdSchema,
  invite_id: inviteIdSchema,
});

export async function resendClientInviteAction(formData: FormData): Promise<InviteActionResult> {
  const parsed = resendSchema.safeParse({
    slug: formData.get("slug"),
    client_id: formData.get("client_id"),
    invite_id: formData.get("invite_id"),
  });
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { slug, client_id, invite_id } = parsed.data;

  const resolved = await resolveActionContext(slug);
  if (!resolved.ok) return resolved;
  const { ctx, member } = resolved.value;

  const pending = await clientInviteRepo.listPendingForClient(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId },
    client_id,
  );
  const target = pending.find((p) => p.id === invite_id);
  if (!target) return { ok: false, error: "That invite no longer exists." };

  await clientInviteRepo.revoke(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId, role: member.role },
    target.id,
  );
  const { token } = await clientInviteRepo.create(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId, role: member.role },
    { clientId: client_id, email: target.email },
  );

  revalidatePath(`/w/${slug}/clients/${client_id}`);
  return {
    ok: true,
    message: `Resent invite to ${target.email}.`,
    inviteUrl: inviteUrl(token),
  };
}

const revokeSchema = z.object({
  slug: slugSchema,
  client_id: clientIdSchema,
  invite_id: inviteIdSchema,
});

export async function revokeClientInviteAction(formData: FormData): Promise<InviteActionResult> {
  const parsed = revokeSchema.safeParse({
    slug: formData.get("slug"),
    client_id: formData.get("client_id"),
    invite_id: formData.get("invite_id"),
  });
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { slug, invite_id, client_id } = parsed.data;

  const resolved = await resolveActionContext(slug);
  if (!resolved.ok) return resolved;
  const { ctx, member } = resolved.value;

  await clientInviteRepo.revoke(
    db(),
    { workspaceId: ctx.workspaceId, userId: member.userId, role: member.role },
    invite_id,
  );
  revalidatePath(`/w/${slug}/clients/${client_id}`);
  return { ok: true, message: "Invite revoked." };
}
