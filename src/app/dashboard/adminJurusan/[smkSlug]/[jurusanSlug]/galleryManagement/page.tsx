import { getMyGaleriList } from "@/lib/getdata/get-galeri";
import GalleryManagement from "./gallery-management";

export default async function Page() {
    const galeriList = await getMyGaleriList();
    return <GalleryManagement initialData={galeriList} />;
}