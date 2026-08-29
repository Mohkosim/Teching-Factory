import { getProdukPublicList } from "@/lib/data/produk-public";
import { getJasaPublicList } from "@/lib/data/jasa-public";
import { getFavoritIds } from "@/lib/data/favorit-public";
import FavoritePageClient from "./FavoritePageClient";

export default async function FavoritePage() {
  const [produkList, jasaList, favoritIds] = await Promise.all([
    getProdukPublicList(),
    getJasaPublicList(),
    getFavoritIds(),
  ]);

  const produkFavorit = produkList.filter((p) => favoritIds.produkIds.includes(p.id));
  const jasaFavorit = jasaList.filter((j) => favoritIds.jasaIds.includes(j.jasaId));

  return <FavoritePageClient produkFavorit={produkFavorit} jasaFavorit={jasaFavorit} />;
}