import { redirect } from "next/navigation";
import Link from "next/link";
import { getJasaDetailById, getJasaRekomendasi } from "@/lib/data/jasa-public";
import JasaDetailClient from "./JasaDetailClient";

export default async function JasaDetailPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const { id } = await searchParams;

    if (!id) {
        redirect("/jasa");
    }

    const jasa = await getJasaDetailById(id);

    if (!jasa) {
        return (
            <div className="py-24 text-center">
                <p className="text-sm text-gray-400">Jasa tidak ditemukan</p>
                <Link href="/jasa" className="mt-3 inline-block text-sm font-medium text-sky-500 hover:underline">
                    Kembali ke daftar jasa
                </Link>
            </div>
        );
    }

    const rekomendasi = await getJasaRekomendasi(jasa.id, 4);

    return <JasaDetailClient key={jasa.id} jasa={jasa} rekomendasi={rekomendasi} />;
}