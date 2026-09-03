import PartnerHero from "./PartnerHero";
import KontakForm from "./KontakForm";
import LokasiKami from "./LokasiKami";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontak",
};

export default function KontakPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PartnerHero />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <KontakForm />
        <LokasiKami />
      </div>
    </div>
  );
}