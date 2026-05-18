// Cached server helpers for resolving the active workspace.
//
// Both `app/w/[slug]/layout.tsx` (the gate) and `app/w/[slug]/(portal)/layout.tsx`
// (the chrome) need the user's workspace list. `cache()` deduplicates the DB
// hit within a single request so we don't double-query.

import "server-only";

import { cache } from "react";

import { db } from "@attuna/db/client";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";
import type { Workspace } from "@attuna/db/schema/workspace";

export const getWorkspacesForUser = cache(async (userId: string): Promise<Workspace[]> => {
  return workspaceRepo.listForUser(db(), userId);
});

export const findWorkspaceBySlug = cache(async (slug: string): Promise<Workspace | null> => {
  return workspaceRepo.findBySlug(db(), slug);
});
