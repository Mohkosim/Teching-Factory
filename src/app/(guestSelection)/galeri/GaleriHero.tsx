"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GaleriKategoriFilter } from "@/types/interfaces/galeri";

const KATEGORI_OPTIONS: GaleriKategoriFilter[] = [
  "Semua",
  "Pameran",
  "Lomba",
  "Pelatihan",
  "Kunjungan",
];

export default function GaleriHero({
  search,
  kategori,
}: {
  search: string;
  kategori: GaleriKategoriFilter;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(search);

  function updateFilters(next: { search?: string; kategori?: string }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? query;
    const nextKategori = next.kategori ?? kategori;
    if (nextSearch) params.set("search", nextSearch);
    if (nextKategori && nextKategori !== "Semua") params.set("kategori", nextKategori);
    router.push(`/galeri?${params.toString()}`);
  }

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-sky-500 to-sky-600 px-4 py-14">
      <div className="absolute inset-0 bg-[url('/images/galeri-bg.jpg')] bg-cover bg-right opacity-30 mix-blend-luminosity" />
      <div className="absolute inset-0 bg-linear-to-b from-sky-500 to-sky-600" />

      <div className="relative mx-auto max-w-6xl">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white">
          GALERI
          <br />
          KEGIATAN
        </h1>
        <p className="mt-3 max-w-md text-sm text-blue-100">
          Temukan berbagai dokumentasi kegiatan siswa mulai dari pameran,
          lomba, pelatihan, hingga kunjungan industri.
        </p>

        <div className="mt-8 mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl bg-white p-2 shadow-lg sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateFilters({ search: query })}
              placeholder="Search"
              className="border-0 pl-9 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-200" />

          <Select
            value={kategori}
            onValueChange={(value) => updateFilters({ kategori: value })}
          >
            <SelectTrigger className="w-full border-0 shadow-none sm:w-40">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              {KATEGORI_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}