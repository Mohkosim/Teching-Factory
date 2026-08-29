import { getKeranjangItems } from "@/lib/getdata/get-keranjang";
import KeranjangClient from "./keranjang-client";

export default async function KeranjangPage() {
    const items = await getKeranjangItems();

    return <KeranjangClient initialItems={items} />;
}