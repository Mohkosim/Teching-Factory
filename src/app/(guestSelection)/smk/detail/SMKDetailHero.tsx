import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { SMKDetailData } from "@/types/interfaces/smk";

export default function SMKDetailHero({ smk }: { smk: SMKDetailData }) {
  return (
    <section className="relative">
      <div className="relative h-72 w-full overflow-hidden bg-linear-to-b from-sky-900 to-sky-700 sm:h-80">
        <div className="absolute inset-0 bg-[url('/img/hero-bg.jpg')] bg-cover bg-center opacity-30" />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-4 pb-20 text-center text-white">
          <p className="text-xs tracking-wide text-white/80">SMK &gt; Detail</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{smk.nama_smk}</h1>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-20 max-w-4xl px-4 pb-8">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{smk.nama_smk}</h2>
              {smk.status_verifikasi && (
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {smk.deskripsi}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {smk.kota}, {smk.provinsi}
            </p>
            <div className="mt-3">
              <span className="text-lg font-bold text-blue-600">{smk.jumlahJurusan}</span>
              <p className="pt-1 text-xs font-medium text-blue-600">
                Jurusan
              </p>
            </div>
          </div>

          <div className="relative h-50 w-50 shrink-0">
            <Image
              src={smk.img || "/img/logo.png"}
              alt={smk.nama_smk}
              fill
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}