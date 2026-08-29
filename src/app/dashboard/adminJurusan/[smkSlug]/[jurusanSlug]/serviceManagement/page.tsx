import { getJasaList } from "@/lib/getdata/get-jasa";
import ServiceManagement from "./service-management";

export default async function Page() {
    const jasaList = await getJasaList();
    const first = jasaList[0];

    return (
        <ServiceManagement
            initialData={jasaList}
            jurusanId={first?.jurusan_id ?? ""}
            jurusanSmkId={first?.jurusan_smk_id ?? ""}
            jurusanSmkNama={first?.jurusan_smk_nama ?? ""}
        />
    );
}