import { getKurirAktifList } from "@/lib/getdata/get-kurir-aktif";
import ShippingData from "./shipping-client";

export default async function PengirimanPage() {
    const initialKurirList = await getKurirAktifList();

    return <ShippingData initialKurirList={initialKurirList} />;
}