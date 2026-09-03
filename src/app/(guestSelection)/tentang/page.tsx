import TentangHero from "./TentangHero";
import ApaItuTefaSection from "./ApaItuTefaSection";
import SolusiTefaSection from "./SolusiTefaSection";
import VideoProfilSection from "./VideoProfilSection";
import { getTentangTefaData } from "@/lib/getdata/get-tentang";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang Tefa",
};

export default async function TentangPage() {
  const tentang = await getTentangTefaData();

  return (
    <div className="min-h-screen bg-white">
      <TentangHero />
      <ApaItuTefaSection />
      <SolusiTefaSection />
      <VideoProfilSection  videoLink={tentang?.videoLink ?? null}/>
    </div>
  );
}