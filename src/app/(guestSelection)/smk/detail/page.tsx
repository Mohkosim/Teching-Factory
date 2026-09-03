import { redirect } from "next/navigation";
import SMKDetailHero from "./SMKDetailHero";
import JurusanListClient from "./JurusanListClient";
import LokasiMap from "./LokasiMap";
import { getSMKDetail } from "@/lib/getdata/getSMKDetail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detail SMK",
};

export default async function SMKDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    redirect("/smk");
  }

  const smk = await getSMKDetail(id);

  if (!smk) {
    redirect("/smk");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SMKDetailHero smk={smk} />
      <JurusanListClient smkId={smk.smk_id} />
      <LokasiMap
        mapLink={smk.map_link}
        alamat={smk.alamat}
        kota={smk.kota}
        provinsi={smk.provinsi}
      />
    </div>
  );
}