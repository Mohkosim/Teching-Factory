import { getSMKList } from "@/lib/getdata/getSMKList";
import { SMKSortOption } from "@/types/interfaces/smk";
import SMKHero from "./SMKHero";
import SMKListClient from "./SMKListClient";

interface SMKPageProps {
  searchParams: Promise<{
    page?: string;
    perPage?: string;
    sort?: string;
    search?: string;
  }>;
}

const VALID_SORTS: SMKSortOption[] = [
  "terbaru",
  "nama_asc",
  "nama_desc",
  "jurusan_terbanyak",
];

export default async function SMKPage({ searchParams }: SMKPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const perPage = Math.max(1, Number(params.perPage) || 8);
  const sort: SMKSortOption = VALID_SORTS.includes(params.sort as SMKSortOption)
    ? (params.sort as SMKSortOption)
    : "terbaru";
  const search = params.search?.trim() || undefined;

  const result = await getSMKList({ page, perPage, sort, search });

  return (
    <div className="min-h-screen bg-gray-50">
      <SMKHero />
      <SMKListClient result={result} sort={sort} perPage={perPage} search={search ?? ""} />
    </div>
  );
}