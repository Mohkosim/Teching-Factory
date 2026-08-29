import { getJasaPublicList } from "@/lib/data/jasa-public";
import { getFavoritIds } from "@/lib/data/favorit-public";
import JasaPageClient from "./JasaPageClient";

export default async function ProdukPage() {
  const [jasaList, favoritIds] = await Promise.all([
    getJasaPublicList(),
    getFavoritIds(),
  ]);

  return <JasaPageClient jasa={jasaList} favoritIds={favoritIds} />;
}