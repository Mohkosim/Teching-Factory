"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SMKListItem } from "@/types/interfaces/smk";

export default function SMKCard({ smk }: { smk: SMKListItem }) {
  const router = useRouter();

  function handleClick() {
    sessionStorage.setItem("selectedSmkId", smk.smk_id);
    router.push("/smk/detail");
  }

  return (
    <button
      onClick={handleClick}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-center px-6 pt-8 pb-6">
        <div className="relative h-32 w-32">
          <Image
            src={smk.img || "/img/logo.png"}
            alt={smk.nama_smk}
            fill
            className="object-contain"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {smk.nama_smk}
          </p>
          <p className="text-xs text-gray-500">{smk.jumlahJurusan} Jurusan</p>
        </div>

        <span className="flex shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600">
          Lihat Detail
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}