import { getJasaList } from "@/lib/getdata/get-jasa";
import { getJurusanNames } from "@/lib/getdata/get-jurusan-list";
import ServiceManagement from "./service-management";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Management",
};

export default async function Page() {
    const [jasaList, jurusanNames] = await Promise.all([
        getJasaList(),
        getJurusanNames(),
    ]);

    return <ServiceManagement initialData={jasaList} jurusanList={jurusanNames} />;
}