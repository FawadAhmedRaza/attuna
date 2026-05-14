import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AnimatedPortalPreview } from "@attuna/ui/AnimatedPortalPreview";
import { FAQSection } from "@attuna/ui/FAQSection";
import { FinalCTASection } from "@attuna/ui/FinalCTASection";
import { Footer } from "@attuna/ui/Footer";
import { HeroSection } from "@attuna/ui/HeroSection";
import { HowItWorksSection } from "@attuna/ui/HowItWorksSection";
import { InsightsSection } from "@attuna/ui/InsightsSection";
import { MarketingNav } from "@attuna/ui/MarketingNav";
import { MarqueeSection } from "@attuna/ui/MarqueeSection";
import { PricingSection } from "@attuna/ui/PricingSection";
import { TestimonialsSection } from "@attuna/ui/TestimonialsSection";

import { ACTIVE_WS_COOKIE_NAME, readActiveWorkspace } from "@/lib/auth/active-workspace";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getWorkspacesForUser } from "@/lib/workspace/resolve";
import { ThemeToggle } from "@/lib/ThemeToggle";

export default async function LandingPage() {
  // Signed-in users go straight to their workspace. We default to the
  // `atn_ws` cookie (last-visited) and fall back to the first membership.
  // Users with no workspaces continue to onboarding.
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;
  if (session) {
    const workspaces = await getWorkspacesForUser(session.userId);
    if (workspaces.length === 0) {
      redirect("/onboarding");
    }
    const lastSlug = await readActiveWorkspace(cookies().get(ACTIVE_WS_COOKIE_NAME)?.value);
    const target =
      (lastSlug ? workspaces.find((w) => w.slug === lastSlug) : undefined) ?? workspaces[0]!;
    redirect(`/w/${target.slug}/today`);
  }

  return (
    <>
      <MarketingNav themeToggle={<ThemeToggle />} />
      <main>
        <HeroSection />
        <AnimatedPortalPreview />
        <MarqueeSection />
        <HowItWorksSection />
        <InsightsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  );
}
