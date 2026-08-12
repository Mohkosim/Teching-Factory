import HeroSection from "@/components/dashboard/HeroSection";
import AboutTefaSection from "@/components/dashboard/AboutTefaSection";
import WhyTefaSection from "@/components/dashboard/WhyTefaSection";
import ProdukSection from "@/components/dashboard/ProdukSection";
import JasaSection from "@/components/dashboard/JasaSection";
import MitraSection from "@/components/dashboard/MitraSection";
import StatistikTefaSection from "@/components/dashboard/StatistikTefaSection";
import SchoolOnboarding from "@/components/dashboard/SchoolOnboardingSection";

export default function Home() {
  return (
    <>
        <HeroSection />
        <AboutTefaSection />
        <WhyTefaSection />
        <ProdukSection />
        <JasaSection />
        <MitraSection />
        <StatistikTefaSection />
        <SchoolOnboarding />
    </>
  );
}
