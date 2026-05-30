"use client";

import Navbar from "@/components/layout/navbar";
import HeroSection from "@/components/dashboard/HeroSection";
import AboutTefaSection from "@/components/dashboard/AboutTefaSection";
import WhyTefaSection from "@/components/dashboard/WhyTefaSection";
import ProdukSection from "@/components/dashboard/ProdukSection";
import JasaSection from "@/components/dashboard/JasaSection";
import MitraSection from "@/components/dashboard/MitraSection";
import StatistikTefaSection from "@/components/dashboard/StatistikTefaSection";
import SchoolOnboarding from "@/components/dashboard/SchoolOnboardingSection";
import Footer from "@/components/layout/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <AboutTefaSection />
        <WhyTefaSection />
        <ProdukSection />
        <JasaSection />
        <MitraSection />
        <StatistikTefaSection />
        <SchoolOnboarding />
      </main>
      <Footer />
    </>
  );
}
