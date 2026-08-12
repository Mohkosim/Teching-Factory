import { getJasaPublicList } from "@/lib/data/jasa-public";
import JasaPageClient from "./JasaPageClient";

export default async function ProdukPage() {
  const jasaList = await getJasaPublicList();

  return <JasaPageClient jasa={jasaList} />;
}