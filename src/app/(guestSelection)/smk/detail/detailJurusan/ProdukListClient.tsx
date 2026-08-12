"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/pagination/Pagination";
import ProdukCard from "@/components/produkcard";
import JasaCard from "@/components/jasa.card";
import { ProdukListResult, ProdukSortOption } from "@/types/interfaces/produk";
import { JasaListResult } from "@/lib/data/jasa-public";

const PER_PAGE_OPTIONS = [10, 20, 50];

const SORT_OPTIONS: { value: ProdukSortOption; label: string }[] = [
  { value: "terbaru", label: "Default" },
  { value: "nama_asc", label: "Nama A-Z" },
  { value: "nama_desc", label: "Nama Z-A" },
  { value: "harga_asc", label: "Harga Terendah" },
  { value: "harga_desc", label: "Harga Tertinggi" },
  { value: "terlaris", label: "Terlaris" },
];

export default function ProdukListClient({
  produkResult,
  jasaResult,
  page,
  perPage,
  sort,
  onPerPageChange,
  onSortChange,
  onPageChange,
}: {
  produkResult: ProdukListResult | null;
  jasaResult: JasaListResult | null;
  page: number;
  perPage: number;
  sort: ProdukSortOption;
  onPerPageChange: (value: number) => void;
  onSortChange: (value: ProdukSortOption) => void;
  onPageChange: (value: number) => void;
}) {
  const produkItems = produkResult?.data ?? [];
  const jasaItems = jasaResult?.data ?? [];
  const totalCount = (produkResult?.totalCount ?? 0) + (jasaResult?.totalCount ?? 0);
  const totalPages = Math.max(produkResult?.totalPages ?? 0, jasaResult?.totalPages ?? 0);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Produk & Jasa List</h2>
          <p className="text-sm text-gray-500">Terdapat {totalCount} Item</p>
        </div>

        <div className="flex gap-3">
          <Select value={String(perPage)} onValueChange={(v) => onPerPageChange(Number(v))}>
            <SelectTrigger className="w-35">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Tampilkan: {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => onSortChange(v as ProdukSortOption)}>
            <SelectTrigger className="w-55">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  Urut Berdasarkan ({opt.label})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {produkItems.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Produk</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {produkItems.map((p) => (
              <ProdukCard key={p.produk_id} produk={p} />
            ))}
          </div>
        </div>
      )}

      {jasaItems.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Jasa</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {jasaItems.map((j) => (
              <JasaCard key={j.id} jasa={j} />
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <p className="mt-8 text-center text-sm text-gray-500">
          Tidak ada produk atau jasa yang ditemukan.
        </p>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </section>
  );
}