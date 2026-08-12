import { getProdukPublicList } from "@/lib/data/produk-public";
import ProdukPageClient from "./ProdukPageClient";

export default async function ProdukPage() {
  const produkList = await getProdukPublicList();

  return <ProdukPageClient produk={produkList} />;
}