import { getTentangTefaData } from "@/lib/getdata/get-tentang";
import AboutTefa from "./about-tefa";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Tefa",
};

export default async function TentangPage() {
    const data = await getTentangTefaData();

    return (
        <AboutTefa
            initialDescription={data?.deskripsi ?? ""}
            initialVideoLink={data?.videoLink ?? ""}
            initialPhotos={data?.dokumentasi ?? []}
        />
    );
}