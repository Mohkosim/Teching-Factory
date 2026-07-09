"use client";
import { useSearchParams } from "next/navigation";
import DetailAkunSMK from "./detailakunsmk";

export default function DetailPage() {
    const searchParams = useSearchParams();
    const id = searchParams?.get("id") ?? null;

    return <DetailAkunSMK id={id} />;
}