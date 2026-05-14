// Server-action permission helper. Resolves the active session + workspace +
// caller's membership in one shot, optionally enforcing a role.
//
// Returns a discriminated union so callers can early-return a user-safe
// error string without throwing. (Server actions that throw surface as
// generic 500s in the form runtime — we'd rather hand back `{ ok: false }`.)

import "server-only";

import { cookies } from "next/headers";

import { db } from "@attuna/db/client";
import type { WorkspaceContext } from "@attuna/db/context";
import { memberRepo } from "@attuna/db/repositories/member-repo";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";
import type { Workspace } from "@attuna/db/schema/workspace";
import type { WorkspaceMember, WorkspaceRole } from "@attuna/db/schema/workspace-member";

import { type AuthSession, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export type ActionContext = {
  readonly session: AuthSession;
  readonly workspace: Workspace;
  readonly member: WorkspaceMember;
  readonly ctx: WorkspaceContext;
};

export type Resolved = { ok: true; value: ActionContext } | { ok: false; error: string };

const ROLE_RANK: Record<WorkspaceRole, number> = {
  clinician: 1,
  admin: 2,
  owner: 3,
};

function hasAtLeast(role: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export async function resolveActionContext(
  slug: string,
  options: { minimumRole?: WorkspaceRole } = {},
): Promise<Resolved> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return { ok: false, error: "Your session expired. Sign in to continue." };
  }

  const workspace = await workspaceRepo.findBySlug(db(), slug);
  if (!workspace) {
    return { ok: false, error: "Workspace not found." };
  }

  const ctx: WorkspaceContext = { workspaceId: workspace.id, userId: session.userId };
  const member = await memberRepo.findOne(db(), ctx, session.userId);
  if (!member || member.status !== "active") {
    return { ok: false, error: "You're not a member of this workspace." };
  }

  if (options.minimumRole && !hasAtLeast(member.role, options.minimumRole)) {
    return { ok: false, error: "You don't have permission for this action." };
  }

  return { ok: true, value: { session, workspace, member, ctx } };
}
