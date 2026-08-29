import { getProdukPublicList } from "@/lib/data/produk-public";
import { getFavoritIds } from "@/lib/data/favorit-public";
import ProdukPageClient from "./ProdukPageClient";

export default async function ProdukPage() {
  const produkList = await getProdukPublicList();
  const favoritIds = await getFavoritIds();

  const lokasiOptions = Array.from(
    new Set(
      produkList
        .map((p) => p.lokasi)
        .filter((v): v is string => Boolean(v))
    )
  ).sort();

  return <ProdukPageClient produk={produkList} lokasiOptions={lokasiOptions} favoritIds={favoritIds} />;
}