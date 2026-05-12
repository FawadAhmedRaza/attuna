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

import { ThemeToggle } from "@/lib/ThemeToggle";

export default function LandingPage() {
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
