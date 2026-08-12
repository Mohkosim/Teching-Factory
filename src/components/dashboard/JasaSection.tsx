import Link from "next/link";
import { ArrowRight } from "lucide-react";
import JasaCard from "@/components/jasa.card";
import { getJasaPublicList } from "@/lib/data/jasa-public";

export default async function JasaSection() {
    const jasaTerbaru = await getJasaPublicList();

    return (
        <section className="py-10 gradient-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-5">
                    <p className="text-sm font-bold text-sky-500">Jasa</p>
                    <h2 className="text-4xl text-blue-950 font-bold py-3">Jasa Siswa</h2>
                    <p className="text-gray-500">Jasa yang diproduksi oleh siswa</p>
                </div>
                <div className="flex justify-end mb-8">
                    <Link
                        href="/jasa"
                        className="hidden sm:inline-flex items-center gap-2 text-sky-500 font-semibold text-sm hover:gap-3 transition-all duration-200"
                    >
                        Lihat Semua <ArrowRight size={16} />
                    </Link>
                </div>

                {/* Grid Cards */}
                {jasaTerbaru.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {jasaTerbaru.slice(0, 4).map((jasa) => (
                            <JasaCard key={jasa.id} jasa={jasa} />
                        ))}
                    </div>
                )}

                {/* Jika tidak ada jasa */}
                {jasaTerbaru.length === 0 && (
                    <p className="mt-8 text-center text-sm text-gray-500">
                        Tidak ada jasa yang ditemukan.
                    </p>
                )}

                {/* Mobile See All */}
                <div className="text-center mt-8 sm:hidden">
                    <Link
                        href="/jasa"
                        className="inline-flex items-center gap-2 bg-sky-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-sky-600 transition-colors duration-200"
                    >
                        Lihat Semua Jasa <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </section>
    );
}