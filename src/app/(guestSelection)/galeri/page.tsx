import { getGaleriList } from "@/lib/getdata/get-galeri";
import { GaleriSortOption, GaleriKategoriFilter } from "@/types/interfaces/galeri";
import GaleriHero from "./GaleriHero";
import GaleriListClient from "./GaleriListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galeri",
};

interface GaleriPageProps {
  searchParams: Promise<{
    page?: string;
    perPage?: string;
    sort?: string;
    search?: string;
    kategori?: string;
  }>;
}

const VALID_SORTS: GaleriSortOption[] = ["terbaru", "terlama", "judul_asc", "judul_desc"];
const VALID_KATEGORI: GaleriKategoriFilter[] = [
  "Semua",
  "Pameran",
  "Lomba",
  "Pelatihan",
  "Kunjungan",
];

export default async function GaleriPage({ searchParams }: GaleriPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const perPage = Math.max(1, Number(params.perPage) || 16);
  const sort: GaleriSortOption = VALID_SORTS.includes(params.sort as GaleriSortOption)
    ? (params.sort as GaleriSortOption)
    : "terbaru";
  const kategori: GaleriKategoriFilter = VALID_KATEGORI.includes(
    params.kategori as GaleriKategoriFilter
  )
    ? (params.kategori as GaleriKategoriFilter)
    : "Semua";
  const search = params.search?.trim() || undefined;

  const result = await getGaleriList({ page, perPage, sort, search, kategori });

  return (
    <div className="min-h-screen bg-gray-50">
      <GaleriHero search={search ?? ""} kategori={kategori} />
      <GaleriListClient
        result={result}
        sort={sort}
        perPage={perPage}
        search={search ?? ""}
        kategori={kategori}
      />
    </div>
  );
}