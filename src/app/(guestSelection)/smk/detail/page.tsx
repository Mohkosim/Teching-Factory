"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SMKDetailHero from "./SMKDetailHero";
import JurusanListClient from "./JurusanListClient";
import LokasiMap from "./LokasiMap";
import { getSMKDetail } from "@/lib/getdata/getSMKDetail";
import { SMKDetailData } from "@/types/interfaces/smk";

export default function SMKDetailPage() {
  const router = useRouter();
  const [smk, setSmk] = useState<SMKDetailData | null>(null);
  const initialized = useRef(false);

  function initRef(node: HTMLDivElement | null) {
    if (!node || initialized.current) return;
    initialized.current = true;

    const smkId = sessionStorage.getItem("selectedSmkId");
    if (!smkId) {
      router.replace("/smk");
      return;
    }

    getSMKDetail(smkId).then(setSmk);
  }

  if (!smk) {
    return <div ref={initRef} className="min-h-screen bg-gray-50" />;
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