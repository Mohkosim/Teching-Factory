import { getProdukList } from "@/lib/getdata/get-produk";
import ProductManagement from "./product-management";

export default async function Page() {
    const produkList = await getProdukList();
    return <ProductManagement initialData={produkList} />;
}