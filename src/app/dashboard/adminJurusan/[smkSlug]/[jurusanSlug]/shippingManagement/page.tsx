import { getKurirAktifList } from "@/lib/getdata/get-kurir-aktif";
import ShippingData from "./shipping-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Management",
};

export default async function PengirimanPage() {
    const initialKurirList = await getKurirAktifList();

    return <ShippingData initialKurirList={initialKurirList} />;
}