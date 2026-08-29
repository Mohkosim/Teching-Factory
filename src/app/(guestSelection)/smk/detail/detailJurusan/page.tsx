"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JurusanDetailHero from "./JurusanDetailHero";
import ProdukListClient from "./ProdukListClient";
import { getJurusanDetail } from "@/lib/getdata/getJurusanDetail";
import { getFavoritIds, FavoritIds } from "@/lib/data/favorit-public";
import { getProdukPublicList, ProdukPublicListResult } from "@/lib/data/produk-public";
import { getJasaListByJurusan, JasaListResult } from "@/lib/data/jasa-public";
import { JurusanDetailData } from "@/types/interfaces/jurusan";
import { ProdukSortOption, ProdukTypeFilter } from "@/types/interfaces/produk";

const EMPTY_FAVORIT: FavoritIds = { produkIds: [], jasaIds: [] };

export default function JurusanDetailPage() {
  const router = useRouter();
  const [jurusan, setJurusan] = useState<JurusanDetailData | null>(null);
  const [produkResult, setProdukResult] = useState<ProdukPublicListResult | null>(null);
  const [jasaResult, setJasaResult] = useState<JasaListResult | null>(null);
  const [favoritIds, setFavoritIds] = useState<FavoritIds>(EMPTY_FAVORIT);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<ProdukTypeFilter>("semua");
  const [sort, setSort] = useState<ProdukSortOption>("terbaru");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const initialized = useRef(false);
  const jurusanIdRef = useRef<string | null>(null);
  function fetchList(params: {
    page: number;
    perPage: number;
    sort: ProdukSortOption;
    type: ProdukTypeFilter;
    search: string;
  }) {
    const jurusanId = jurusanIdRef.current;
    if (!jurusanId) return;

    if (params.type === "semua" || params.type === "produk") {
      getProdukPublicList({ jurusanId, ...params }).then(setProdukResult);
    } else {
      setProdukResult(null);
    }

    if (params.type === "semua" || params.type === "jasa") {
      getJasaListByJurusan({ jurusanId, ...params }).then(setJasaResult);
    } else {
      setJasaResult(null);
    }
  }

  function initRef(node: HTMLDivElement | null) {
    if (!node || initialized.current) return;
    initialized.current = true;

    const jurusanId = sessionStorage.getItem("selectedJurusanId");
    if (!jurusanId) {
      router.replace("/smk");
      return;
    }

    jurusanIdRef.current = jurusanId;

    const initialParams = {
      page: 1,
      perPage: 10,
      sort: "terbaru" as ProdukSortOption,
      type: "semua" as ProdukTypeFilter,
      search: "",
    };

    Promise.all([
      getJurusanDetail(jurusanId),
      getProdukPublicList({ jurusanId, ...initialParams }),
      getJasaListByJurusan({ jurusanId, ...initialParams }),
      getFavoritIds().catch(() => EMPTY_FAVORIT),
    ]).then(([jurusanData, produk, jasa, favorit]) => {
      setJurusan(jurusanData);
      setProdukResult(produk);
      setJasaResult(jasa);
      setFavoritIds(favorit);
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    fetchList({ page: 1, perPage, sort, type, search: value });
  }

  function handleTypeChange(value: ProdukTypeFilter) {
    setType(value);
    setPage(1);
    fetchList({ page: 1, perPage, sort, type: value, search });
  }

  function handleSortChange(value: ProdukSortOption) {
    setSort(value);
    setPage(1);
    fetchList({ page: 1, perPage, sort: value, type, search });
  }

  function handlePerPageChange(value: number) {
    setPerPage(value);
    setPage(1);
    fetchList({ page: 1, perPage: value, sort, type, search });
  }

  function handlePageChange(value: number) {
    setPage(value);
    fetchList({ page: value, perPage, sort, type, search });
  }

  if (!jurusan) {
    return <div ref={initRef} className="min-h-screen bg-gray-50" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <JurusanDetailHero
        jurusan={jurusan}
        search={search}
        type={type}
        onSearchChange={handleSearchChange}
        onTypeChange={handleTypeChange}
      />
      <ProdukListClient
        produkResult={produkResult}
        jasaResult={jasaResult}
        favoritIds={favoritIds}
        page={page}
        perPage={perPage}
        sort={sort}
        onPerPageChange={handlePerPageChange}
        onSortChange={handleSortChange}
        onPageChange={handlePageChange}
      />
    </div>
  );
}