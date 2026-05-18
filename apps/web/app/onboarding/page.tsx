import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthShell } from "@attuna/ui/AuthShell";
import { db } from "@attuna/db/client";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";

import { ThemeToggle } from "@/lib/ThemeToggle";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

import { OnboardingFlow } from "./OnboardingFlow";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    redirect("/signin?next=/onboarding");
  }

  // Users who already have a workspace skip onboarding.
  const workspaces = await workspaceRepo.listForUser(db(), session.userId);
  if (workspaces.length > 0) {
    redirect(`/w/${workspaces[0]!.slug}/today`);
  }

  return (
    <AuthShell themeToggle={<ThemeToggle />} wide>
      <OnboardingFlow />
    </AuthShell>
  );
}
