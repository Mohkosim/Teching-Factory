import { getProdukList } from "@/lib/getdata/get-produk";
import { getJurusanNames } from "@/lib/getdata/get-jurusan-list";
import ProductManagement from "./product-management";

export default async function Page() {
    const [products, jurusanNames] = await Promise.all([
        getProdukList(),
        getJurusanNames(),
    ]);

    return <ProductManagement initialData={products} jurusanList={jurusanNames} />;
}