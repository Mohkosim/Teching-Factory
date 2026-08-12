import Image from "next/image";
import { Badge } from "@/components/ui/badge";

export default function TentangHero() {
  return (
    <section className="bg-linear-to-br from-sky-500 to-sky-600 px-4 py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <div className="relative aspect-5/3 w-full overflow-hidden rounded-3xl shadow-lg">
          <Image
            src="/img/school.png"
            alt="Gedung SMK Teaching Factory"
            fill
            className="object-cover"
          />
        </div>

        <div>
          <Badge className="mb-4 bg-blue-100 text-sky-600 hover:bg-blue-100">
            Tentang Kami
          </Badge>
          <h1 className="text-3xl font-extrabold leading-tight text-white md:text-4xl">
            Karya <span className="text-sky-900">Siswa</span>{" "}
            <span className="text-sky-900">Kualitas</span> Hasil Industri
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white">
            Teaching Factory (TEFA) adalah platform yang mempertemukan hasil
            karya siswa SMK, baik produk maupun jasa, langsung dengan
            masyarakat dan dunia industri. Setiap produk dikerjakan dengan
            standar kerja profesional sebagai bagian dari proses belajar
            siswa.
          </p>
        </div>
      </div>
    </section>
  );
}