import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen, Package, Briefcase, ArrowRight } from "lucide-react";
import { getTefaStats } from "@/lib/getdata/get-stats";
import { getTentangTefaData } from "@/lib/getdata/get-tentang";

function formatStat(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
}

export default async function ApaItuTefaSection() {
  const [stats, tentang] = await Promise.all([
    getTefaStats(),
    getTentangTefaData(),
  ]);

  const STATS = [
    { icon: GraduationCap, label: "SMK", value: formatStat(stats.smk) },
    { icon: BookOpen, label: "Jurusan", value: formatStat(stats.jurusan) },
    { icon: Package, label: "Produk", value: formatStat(stats.produk) },
    { icon: Briefcase, label: "Jasa", value: formatStat(stats.jasa) },
  ];

  const deskripsi = tentang?.deskripsi || "Deskripsi belum tersedia.";
  const foto = tentang?.dokumentasi ?? [];

  const fotoCollage = [0, 1, 2, 3].map((i) => foto[i]?.url ?? null);

  return (
    <section className="bg-sky-50 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          {/* Kiri: teks + stats */}
          <div>
            <Badge className="mb-3 bg-blue-100 text-sky-500 hover:bg-blue-100">
              Tentang TEFA
            </Badge>

            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Apa itu TEFA?
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-gray-500 whitespace-pre-line">
              {deskripsi}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              {STATS.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="leading-tight">
                      <p className="text-sm font-bold">{value}</p>
                      <p className="text-xs text-blue-100">{label}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Kanan: foto collage asimetris dari dokumentasi */}
          <div className="grid grid-cols-2 gap-4">
            {/* Kolom kiri */}
            <div className="flex flex-col gap-4">
              <div className="relative h-64 overflow-hidden rounded-3xl bg-gray-100">
                {fotoCollage[0] && (
                  <Image src={fotoCollage[0]} alt="Kegiatan TEFA" fill className="object-cover" />
                )}
              </div>
              <div className="relative h-48 overflow-hidden rounded-3xl bg-gray-100">
                {fotoCollage[2] && (
                  <Image src={fotoCollage[2]} alt="Kegiatan TEFA" fill className="object-cover" />
                )}
              </div>
            </div>

            {/* Kolom kanan, sedikit turun */}
            <div className="flex flex-col gap-4 pt-8">
              <div className="relative h-48 overflow-hidden rounded-3xl bg-gray-100">
                {fotoCollage[1] && (
                  <Image src={fotoCollage[1]} alt="Kegiatan TEFA" fill className="object-cover" />
                )}
              </div>
              <div className="relative h-64 overflow-hidden rounded-3xl bg-gray-100">
                {fotoCollage[3] && (
                  <Image src={fotoCollage[3]} alt="Kegiatan TEFA" fill className="object-cover" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}