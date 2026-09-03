import { getProdukList } from "@/lib/getdata/get-produk";
import ProductManagement from "./product-management";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Management",
};

export default async function Page() {
    const produkList = await getProdukList();
    return <ProductManagement initialData={produkList} />;
}