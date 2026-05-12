import type { Metadata } from "next";

import { AuthShell } from "@attuna/ui/AuthShell";

import { ThemeToggle } from "@/lib/ThemeToggle";

import { OnboardingFlow } from "./OnboardingFlow";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <AuthShell themeToggle={<ThemeToggle />} wide>
      <OnboardingFlow />
    </AuthShell>
  );
}
