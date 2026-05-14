import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

import { PageHeader } from "../_components/PageHeader";

import { SettingsTabs } from "./SettingsTabs";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  // Profile facts come from the session cookie. Cognito will own these once
  // wired (Phase 2 acceptance) — name + email become read-only here either
  // way; deeper profile edits happen via /me/onboarding.
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <PageHeader
        eyebrow="Your account"
        title="Settings"
        subtitle="Quiet defaults. Change what you need; the rest stays out of the way."
      />

      <SettingsTabs name={session?.name ?? "—"} email={session?.email ?? "—"} />
    </div>
  );
}
