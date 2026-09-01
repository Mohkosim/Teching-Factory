import { getJasaPublicList } from "@/lib/data/jasa-public";
import { getFavoritIds } from "@/lib/data/favorit-public";
import JasaPageClient from "./JasaPageClient";

export default async function JasaPage() {
  const jasaList = await getJasaPublicList();
  const favoritIds = await getFavoritIds();

  const lokasiOptions = Array.from(
    new Set(
      jasaList
        .map((j) => j.provinsi)
        .filter((v): v is string => Boolean(v))
    )
  ).sort();

  return <JasaPageClient jasa={jasaList} lokasiOptions={lokasiOptions} favoritIds={favoritIds} />;
}