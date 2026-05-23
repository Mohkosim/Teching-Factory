"use client";
import Navbar from "@/components/layout/navbar";
import HeroSection from "@/components/layout/dahboard/HeroSection";
import AboutTefaSection from "@/components/layout/dahboard/AboutTefaSection";
import WhyTefaSection from "@/components/layout/dahboard/WhyTefaSection";
import ProdukSection from "@/components/layout/dahboard/ProdukSection";
import JasaSection from "@/components/layout/dahboard/JasaSection";
import MitraSection from "@/components/layout/dahboard/MitraSection";
import StatistikTefaSection from "@/components/layout/dahboard/StatistikTefaSection";
import SchoolOnboarding from "@/components/layout/dahboard/SchoolOnboardingSection";
import Footer from "@/components/layout/footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <HeroSection/>
      <AboutTefaSection/>
      <WhyTefaSection/>
      <ProdukSection/>
      <JasaSection/>
      <MitraSection/>
      <StatistikTefaSection/>
      <SchoolOnboarding/>
      <Footer />
    </main>
  );
}
