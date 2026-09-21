import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSMKAccountDetail } from "@/lib/getdata/get-smk-account-detail";
import SMKAccountDetailView from "./smk-account-detail";

export const metadata: Metadata = {
    title: "Detail Akun SMK",
};

export default async function Page({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    const detail = await getSMKAccountDetail(userId);

    if (!detail) notFound();

    return <SMKAccountDetailView data={detail} />;
}
