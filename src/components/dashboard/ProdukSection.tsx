import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProdukCard from "@/components/produkcard";
import { getProdukPublicList } from "@/lib/data/produk-public";

const JUMLAH_TAMPIL = 4;

const JUMLAH_FETCH = 12;

export default async function ProdukSection() {
    const { data: produkFetched } = await getProdukPublicList({
        sort: "terbaru",
        page: 1,
        perPage: JUMLAH_FETCH,
    });

    const produkTerbaru = produkFetched
        .filter((p) => p.stok > 0)
        .slice(0, JUMLAH_TAMPIL);

    return (
        <section className="py-10 bg-sky-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-5">
                    <p className="text-sm font-bold text-sky-500">Produk</p>
                    <h2 className="text-4xl text-blue-950 font-bold py-3">Produk Siswa</h2>
                    <p className="text-gray-500">Produk terbaru yang diproduksi oleh siswa</p>
                </div>
                <div className="flex justify-end mb-8">
                    <Link
                        href="/produk"
                        className="hidden sm:inline-flex items-center gap-2 text-sky-500 font-semibold text-sm hover:gap-3 transition-all duration-200"
                    >
                        Lihat Semua <ArrowRight size={16} />
                    </Link>
                </div>

                {/* Grid Cards */}
                {produkTerbaru.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {produkTerbaru.map((p) => (
                            <ProdukCard key={p.id} product={p} />
                        ))}
                    </div>
                )}

                {/* Jika tidak ada produk */}
                {produkTerbaru.length === 0 && (
                    <p className="mt-8 text-center text-sm text-gray-500">
                        Tidak ada produk yang ditemukan.
                    </p>
                )}

                {/* Mobile See All */}
                <div className="text-center mt-8 sm:hidden">
                    <Link
                        href="/produk"
                        className="inline-flex items-center gap-2 bg-sky-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-sky-600 transition-colors duration-200"
                    >
                        Lihat Semua Produk <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </section>
    );
}