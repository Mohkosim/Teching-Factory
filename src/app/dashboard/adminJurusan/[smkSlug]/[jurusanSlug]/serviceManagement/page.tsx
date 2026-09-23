import { getJasaList } from "@/lib/getdata/get-jasa";
import { getKurirAktifList } from "@/lib/getdata/get-kurir-aktif";
import ServiceManagement from "./service-management";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Management",
};

export default async function Page() {
    const [jasaList, kurirAktifList] = await Promise.all([
        getJasaList(),
        getKurirAktifList(),
    ]);
    const first = jasaList[0];
    const hasKurirAktif = kurirAktifList.some((k) => k.status);

    return (
        <ServiceManagement
            initialData={jasaList}
            jurusanId={first?.jurusan_id ?? ""}
            jurusanSmkId={first?.jurusan_smk_id ?? ""}
            jurusanSmkNama={first?.jurusan_smk_nama ?? ""}
            hasKurirAktif={hasKurirAktif}
        />
    );
}