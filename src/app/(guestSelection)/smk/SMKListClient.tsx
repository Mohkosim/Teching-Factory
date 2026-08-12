"use client";

import { useRouter, usePathname } from "next/navigation";
import { SMKListResult, SMKSortOption } from "@/types/interfaces/smk";
import SMKCard from "./SMKCard";
import Pagination from "@/components/pagination/Pagination";

interface SMKListClientProps {
  result: SMKListResult;
  sort: SMKSortOption;
  perPage: number;
  search: string;
}

const SORT_OPTIONS: { value: SMKSortOption; label: string }[] = [
  { value: "terbaru", label: "Terbaru" },
  { value: "nama_asc", label: "Nama (A-Z)" },
  { value: "nama_desc", label: "Nama (Z-A)" },
  { value: "jurusan_terbanyak", label: "Jurusan Terbanyak" },
];

const PER_PAGE_OPTIONS = [4, 8, 12, 16];

export default function SMKListClient({
  result,
  sort,
  perPage,
  search,
}: SMKListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, totalCount, totalPages, currentPage } = result;

  function updateParams(next: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("sort", String(next.sort ?? sort));
    params.set("perPage", String(next.perPage ?? perPage));
    params.set("page", String(next.page ?? 1));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">SMK List</h2>
          <span className="text-sm text-gray-500">
            Terdapat {totalCount} SMK
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Tampilkan
            <select
              value={perPage}
              onChange={(e) => updateParams({ perPage: Number(e.target.value) })}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Urut berdasarkan: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-500">
          Tidak ada SMK yang ditemukan{search ? ` untuk "${search}"` : ""}.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {data.map((smk) => (
            <SMKCard key={smk.smk_id} smk={smk} />
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
