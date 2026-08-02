import { getGaleriList } from "@/lib/getdata/get-galeri";
import GalleryManagement from "./gallery-management";

export default async function Page() {
    const galeriList = await getGaleriList();
    return <GalleryManagement initialData={galeriList} />;
}