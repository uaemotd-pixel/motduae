import { HeroSection } from "@/components/home/HeroSection";
import { TrendingSection } from "@/components/home/TrendingDesigns";
import { PremiumFabrics } from "@/components/home/PremiumFabrics";
import { ReadyToWearSection } from "@/components/home/ReadyToWear";
import { TailorsSection } from "@/components/home/TailorsSection";
import { MeasurementGuide } from "@/components/home/MeasurementGuide";
import { Testimonials } from "@/components/home/Testimonials";
import { PartnerSection } from "@/components/home/PartnerSection";
import FadeInSection from "@/components/shared/fadeInSection";

/**
 * Homepage — section order matches Design/index.html exactly.
 * Navbar (1), TrustBar (12), and Footer (13) live in [locale]/layout.tsx.
 */
export default function HomePage() {
  return (
    <>
      {/* 2. Hero — Mukhawara of the Day */}
      <FadeInSection>
        <HeroSection />
      </FadeInSection>
      {/* 3. Trending Designs of Mukhawar Section */}
      <FadeInSection>
        <TrendingSection />
      </FadeInSection>
      {/* 4. Premium Fabrics Section */}
      <FadeInSection>
        <PremiumFabrics />
      </FadeInSection>
      {/* 5. Ready To Wear Section */}
      <FadeInSection>
        <ReadyToWearSection />
      </FadeInSection>
      {/* 6. Meet the Tailors */}
      <FadeInSection>
        <TailorsSection />
      </FadeInSection>
      {/* 7. Measure with Confidence */}
      <FadeInSection>
        <MeasurementGuide />
      </FadeInSection>
      {/* 8. Testimonial Section */}
      <FadeInSection>
        <Testimonials />
      </FadeInSection>
      {/* 9. Join Our Community Section */}
      <FadeInSection>
        <PartnerSection />
      </FadeInSection>
    </>
  );
}