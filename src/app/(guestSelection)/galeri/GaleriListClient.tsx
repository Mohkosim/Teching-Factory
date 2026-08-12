"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GaleriListResult,
  GaleriSortOption,
  GaleriKategoriFilter,
} from "@/types/interfaces/galeri";
import GaleriCard from "./GaleriCard";
import Pagination from "@/components/pagination/Pagination";

interface GaleriListClientProps {
  result: GaleriListResult;
  sort: GaleriSortOption;
  perPage: number;
  search: string;
  kategori: GaleriKategoriFilter;
}

const SORT_OPTIONS: { value: GaleriSortOption; label: string }[] = [
  { value: "terbaru", label: "Terbaru" },
  { value: "terlama", label: "Terlama" },
  { value: "judul_asc", label: "Judul (A-Z)" },
  { value: "judul_desc", label: "Judul (Z-A)" },
];

const PER_PAGE_OPTIONS = [16, 24, 32, 48];

export default function GaleriListClient({
  result,
  sort,
  perPage,
  search,
  kategori,
}: GaleriListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, totalCount, totalPages, currentPage } = result;

  function updateParams(next: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (kategori && kategori !== "Semua") params.set("kategori", kategori);
    params.set("sort", String(next.sort ?? sort));
    params.set("perPage", String(next.perPage ?? perPage));
    params.set("page", String(next.page ?? 1));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Galeri List</h2>
          <span className="text-sm text-gray-500">
            Terdapat {totalCount} galeri
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            Tampilkan
            <Select
              value={String(perPage)}
              onValueChange={(value) => updateParams({ perPage: Number(value) })}
            >
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={sort} onValueChange={(value) => updateParams({ sort: value })}>
            <SelectTrigger className="w-56 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  Urut berdasarkan: {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-500">
          Tidak ada galeri yang ditemukan{search ? ` untuk "${search}"` : ""}.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.map((galeri) => (
            <GaleriCard key={galeri.galeri_id} galeri={galeri} />
          ))}
        </div>
      )}

      {totalPages && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => updateParams({ page })}
        />
      )}
    </section>
  );
}
