"use client";

import { useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/pagination/Pagination";
import JurusanCard from "./JurusanCard";
import { getJurusanListBySMK } from "@/lib/getdata/getJurusanListBySMK";
import { JurusanListResult, JurusanSortOption } from "@/types/interfaces/jurusan";

const PER_PAGE_OPTIONS = [10, 20, 50];

const SORT_OPTIONS: { value: JurusanSortOption; label: string }[] = [
  { value: "terbaru", label: "Default" },
  { value: "nama_asc", label: "Nama A-Z" },
  { value: "nama_desc", label: "Nama Z-A" },
  { value: "produk_terbanyak", label: "Produk Terbanyak" },
];

export default function JurusanListClient({ smkId }: { smkId: string }) {
  const [result, setResult] = useState<JurusanListResult | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sort, setSort] = useState<JurusanSortOption>("terbaru");
  const initialized = useRef(false);

  function fetchData(params: { page: number; perPage: number; sort: JurusanSortOption }) {
    getJurusanListBySMK({ smkId, ...params }).then(setResult);
  }

  function initRef(node: HTMLDivElement | null) {
    if (!node || initialized.current) return;
    initialized.current = true;
    fetchData({ page, perPage, sort });
  }

  function handlePerPageChange(value: string) {
    const next = Number(value);
    setPerPage(next);
    setPage(1);
    fetchData({ page: 1, perPage: next, sort });
  }

  function handleSortChange(value: string) {
    const next = value as JurusanSortOption;
    setSort(next);
    setPage(1);
    fetchData({ page: 1, perPage, sort: next });
  }

  function handlePageChange(next: number) {
    setPage(next);
    fetchData({ page: next, perPage, sort });
  }

  return (
    <section ref={initRef} className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Jurusan List</h2>
          <p className="text-sm text-gray-500">
            Terdapat {result?.totalCount ?? 0} Jurusan
          </p>
        </div>

        <div className="flex gap-3">
          <Select value={String(perPage)} onValueChange={handlePerPageChange}>
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

          <Select value={sort} onValueChange={handleSortChange}>
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

      {result && result.data.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.data.map((j) => (
            <JurusanCard key={j.jurusan_id} jurusan={j} />
          ))}
        </div>
      )}

      {result && result.totalCount === 0 && (
        <p className="mt-8 text-center text-sm text-gray-500">
          Belum ada jurusan yang terdaftar.
        </p>
      )}

      {result && result.totalPages && (
        <Pagination
          currentPage={page}
          totalPages={result.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </section>
  );
}