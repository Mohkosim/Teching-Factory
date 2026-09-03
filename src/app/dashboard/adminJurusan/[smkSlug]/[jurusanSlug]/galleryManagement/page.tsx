import { getMyGaleriList } from "@/lib/getdata/get-galeri";
import GalleryManagement from "./gallery-management";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery Management",
};

export default async function Page() {
    const galeriList = await getMyGaleriList();
    return <GalleryManagement initialData={galeriList} />;
}