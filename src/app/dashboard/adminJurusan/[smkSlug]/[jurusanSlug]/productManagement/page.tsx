import { getProdukList } from "@/lib/getdata/get-produk";
import { getKurirAktifList } from "@/lib/getdata/get-kurir-aktif";
import ProductManagement from "./product-management";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Management",
};

export default async function Page() {
    const [produkList, kurirAktifList] = await Promise.all([
        getProdukList(),
        getKurirAktifList(),
    ]);
    const hasKurirAktif = kurirAktifList.some((k) => k.status);

    return <ProductManagement initialData={produkList} hasKurirAktif={hasKurirAktif} />;
}