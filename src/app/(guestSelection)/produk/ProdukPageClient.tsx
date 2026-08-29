"use client";

import { useMemo, useState } from "react";
import type { FavoritIds } from "@/lib/data/favorit-public";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    Search,
    ShoppingBag,
    Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Filter, { FilterValue, emptyFilterValue } from "@/components/filter/produk/filter";
import Sorting, { SortOption } from "@/components/filter/produk/sorting";
import ProdukCard from "@/components/produkcard";
import type { ProdukPublicItem } from "@/lib/data/produk-public";
import Pagination from "@/components/pagination/Pagination";

type UrutanToolbar = "default" | "termurah" | "termahal" | "terlaris";

interface ProdukPageClientProps {
    produk: ProdukPublicItem[];
    lokasiOptions: string[];
    favoritIds: FavoritIds;
}

export default function ProdukPageClient({ produk, lokasiOptions, favoritIds }: ProdukPageClientProps) {
    const [halaman, setHalaman] = useState(1);
    const [perHalaman, setPerHalaman] = useState(12);

    const [filter, setFilter] = useState<FilterValue>(emptyFilterValue);
    const [sort, setSort] = useState<SortOption>("");
    const [urutanToolbar, setUrutanToolbar] = useState<UrutanToolbar>("default");

    const produkTersaring = useMemo(() => {
        let hasil = produk.filter((p) => {
            const matchLokasi = filter.lokasi.length === 0 || (p.lokasi ? filter.lokasi.includes(p.lokasi) : false);
            const matchRating = filter.rating === null || (p.rating ?? 0) >= filter.rating;
            const matchHargaMin = filter.hargaMin === "" || p.harga >= Number(filter.hargaMin);
            const matchHargaMax = filter.hargaMax === "" || p.harga <= Number(filter.hargaMax);

            return matchLokasi && matchRating && matchHargaMin && matchHargaMax;
        });

        if (sort === "Terpopuler") {
            hasil = hasil.sort((a, b) => b.terjual - a.terjual);
        } else if (sort === "Terlama") {
            hasil = [...hasil].reverse();
        }

        if (urutanToolbar === "termurah") {
            hasil = [...hasil].sort((a, b) => a.harga - b.harga);
        } else if (urutanToolbar === "termahal") {
            hasil = [...hasil].sort((a, b) => b.harga - a.harga);
        } else if (urutanToolbar === "terlaris") {
            hasil = [...hasil].sort((a, b) => b.terjual - a.terjual);
        }

        // Produk stok habis selalu didorong ke belakang, apapun sorting-nya.
        // Sort JS stabil, jadi urutan hasil sorting di atas tetap terjaga
        // di dalam masing-masing grup (tersedia duluan, habis belakangan).
        hasil = [...hasil].sort((a, b) => {
            const aHabis = a.stok <= 0 ? 1 : 0;
            const bHabis = b.stok <= 0 ? 1 : 0;
            return aHabis - bHabis;
        });

        return hasil;
    }, [filter, sort, urutanToolbar, produk]);

    const totalProduk = produkTersaring.length;
    const totalHalaman = Math.max(1, Math.ceil(totalProduk / perHalaman));

    const produkHalamanIni = useMemo(() => {
        const start = (halaman - 1) * perHalaman;
        return produkTersaring.slice(start, start + perHalaman);
    }, [produkTersaring, halaman, perHalaman]);

    return (
        <div className="min-h-screen bg-gray-50">
            <section className="relative overflow-hidden bg-linear-to-b from-sky-500 to-sky-600 px-4 py-14 sm:px-6 lg:px-8">
                <div className="pointer-events-none absolute inset-0 opacity-90">
                    <FloatingIcon className="left-[8%] top-8 -rotate-12" icon={<ShoppingBag className="h-5 w-5 text-sky-500" />} />
                    <FloatingIcon className="left-[18%] top-24 rotate-6" icon={<Star className="h-5 w-5 text-sky-500" />} />
                    <FloatingIcon className="right-[10%] top-6 rotate-12" icon={<ShoppingBag className="h-5 w-5 text-sky-500" />} />
                    <FloatingIcon className="right-[20%] top-28 -rotate-6" icon={<Star className="h-5 w-5 text-sky-500" />} />
                </div>

                <div className="relative mx-auto max-w-3xl text-center">
                    <h1 className="text-2xl font-bold tracking-wide text-white sm:text-3xl">
                        TEMUKAN PRODUK UNGGULAN
                    </h1>

                    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 rounded-4xl bg-white p-3 shadow-lg sm:flex-row sm:items-center">
                        <div className="relative flex-1 border-2 border-gray-200 rounded-2xl">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Cari produk..."
                                className="border-0 pl-9 shadow-none focus-visible:ring-0"
                            />
                        </div>

                        <div className="hidden h-8 w-px bg-gray-200 sm:block" />

                        <Filter value={filter} onApply={setFilter} lokasiOptions={lokasiOptions} />

                        <div className="hidden h-8 w-px bg-gray-200 sm:block" />

                        <Sorting value={sort} onApply={setSort} />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Produk List</h2>
                        <p className="text-sm text-gray-500">
                            Terdapat {totalProduk.toLocaleString("id-ID")} produk
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Tampilkan:</span>
                            <Select
                                value={String(perHalaman)}
                                onValueChange={(v) => {
                                    setPerHalaman(Number(v));
                                    setHalaman(1);
                                }}
                            >
                                <SelectTrigger className="h-9 w-auto rounded-lg border-gray-200 bg-white text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12">12</SelectItem>
                                    <SelectItem value="24">24</SelectItem>
                                    <SelectItem value="48">48</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Urutkan berdasarkan:</span>
                            <Select
                                value={urutanToolbar}
                                onValueChange={(v) => setUrutanToolbar(v as UrutanToolbar)}
                            >
                                <SelectTrigger className="h-9 w-40 rounded-lg border-gray-200 bg-white text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">(Default)</SelectItem>
                                    <SelectItem value="termurah">Harga Termurah</SelectItem>
                                    <SelectItem value="termahal">Harga Termahal</SelectItem>
                                    <SelectItem value="terlaris">Terlaris</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {produkHalamanIni.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-400">
                        {produk.length === 0
                            ? "Belum ada produk yang tersedia saat ini"
                            : "Tidak ada produk yang cocok dengan filter ini"}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                        {produkHalamanIni.map((p) => (
                            <ProdukCard
                                key={p.id}
                                product={p}
                                initialFavorited={favoritIds.produkIds.includes(p.id)}
                            />
                        ))}
                    </div>
                )}

                <Pagination
                    currentPage={halaman}
                    totalPages={totalHalaman}
                    onPageChange={setHalaman}
                />
            </section>
        </div>
    );
}

function FloatingIcon({
    icon,
    className,
}: {
    icon: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "absolute flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow-md",
                className
            )}
        >
            {icon}
        </div>
    );
}