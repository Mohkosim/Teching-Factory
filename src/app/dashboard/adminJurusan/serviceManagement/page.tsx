import { getJasaList } from "@/lib/getdata/get-jasa";
import ServiceManagement from "./service-management";

export default async function Page() {
    const jasaList = await getJasaList();
    return <ServiceManagement initialData={jasaList} />;
}