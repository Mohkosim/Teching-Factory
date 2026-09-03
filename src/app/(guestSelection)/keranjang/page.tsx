import { getKeranjangItems } from "@/lib/getdata/get-keranjang";
import KeranjangClient from "./keranjang-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keranjang",
};

export default async function KeranjangPage() {
    const items = await getKeranjangItems();

    return <KeranjangClient initialItems={items} />;
}