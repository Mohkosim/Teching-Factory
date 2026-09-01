"use client";

import { useMemo, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import FilterJasa, { FilterJasaValue, emptyFilterJasaValue } from "@/components/filter/jasa/filter";
import type { JasaPublicItem } from "@/lib/data/jasa-public";
import type { FavoritIds } from "@/lib/data/favorit-public";
import JasaCard from "@/components/jasa.card";
import Pagination from "@/components/pagination/Pagination";

type UrutanToolbar = "default" | "termurah" | "termahal" | "terlaris";

interface JasaPageClientProps {
    jasa: JasaPublicItem[];
    lokasiOptions: string[];
    favoritIds: FavoritIds;
}

export default function JasaPageClient({ jasa, lokasiOptions, favoritIds }: JasaPageClientProps) {
    const [search, setSearch] = useState("");
    const [halaman, setHalaman] = useState(1);
    const [perHalaman, setPerHalaman] = useState(12);

    const [filter, setFilter] = useState<FilterJasaValue>(emptyFilterJasaValue);
    const [urutanToolbar, setUrutanToolbar] = useState<UrutanToolbar>("default");

    const jasaTersaring = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        let hasil = jasa.filter((j) => {
            const matchSearch = keyword === "" || j.nama.toLowerCase().includes(keyword);
            const matchLokasi = filter.lokasi.length === 0 || (j.provinsi ? filter.lokasi.includes(j.provinsi) : false);
            const matchRating = filter.rating === null || j.rating >= filter.rating;
            const matchHargaMin = filter.hargaMin === "" || j.harga >= Number(filter.hargaMin);
            const matchHargaMax = filter.hargaMax === "" || j.harga <= Number(filter.hargaMax);

            return matchSearch && matchLokasi && matchRating && matchHargaMin && matchHargaMax;
        });

        if (urutanToolbar === "termurah") {
            hasil = [...hasil].sort((a, b) => a.harga - b.harga);
        } else if (urutanToolbar === "termahal") {
            hasil = [...hasil].sort((a, b) => b.harga - a.harga);
        } else if (urutanToolbar === "terlaris") {
            hasil = [...hasil].sort((a, b) => b.dipesan - a.dipesan);
        }

        return hasil;
    }, [filter, search, urutanToolbar, jasa]); // <- tambahkan `search`

    const totalJasa = jasaTersaring.length;
    const totalHalaman = Math.max(1, Math.ceil(totalJasa / perHalaman));

    const jasaHalamanIni = useMemo(() => {
        const start = (halaman - 1) * perHalaman;
        return jasaTersaring.slice(start, start + perHalaman);
    }, [jasaTersaring, halaman, perHalaman]);

    return (
        <div className="min-h-screen bg-gray-50">
            <section className="relative overflow-hidden bg-linear-to-br from-sky-500 to-sky-600 px-4 py-14 sm:px-6 lg:px-8">
                <div className="pointer-events-none absolute inset-0 opacity-90">
                    <FloatingIcon className="left-[8%] top-8 -rotate-12" icon={<ShoppingBag className="h-5 w-5 text-sky-500" />} />
                    <FloatingIcon className="left-[18%] top-24 rotate-6" icon={<Star className="h-5 w-5 text-sky-500" />} />
                    <FloatingIcon className="right-[10%] top-6 rotate-12" icon={<ShoppingBag className="h-5 w-5 text-sky-500" />} />
                    <FloatingIcon className="right-[20%] top-28 -rotate-6" icon={<Star className="h-5 w-5 text-sky-500" />} />
                </div>

                <div className="relative mx-auto max-w-3xl text-center">
                    <h1 className="text-2xl font-bold tracking-wide text-white sm:text-3xl">
                        TEMUKAN JASA DENGAN KEBUTUHAN ANDA
                    </h1>

                    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 rounded-4xl bg-white p-3 shadow-lg sm:flex-row sm:items-center">
                        <div className="relative flex-1 border-2 border-gray-200 rounded-2xl">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Cari jasa..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setHalaman(1);
                                }}
                                className="border-0 pl-9 shadow-none focus-visible:ring-0"
                            />
                        </div>

                        <div className="hidden h-8 w-px bg-gray-200 sm:block" />

                        <FilterJasa value={filter} onApply={setFilter} lokasiOptions={lokasiOptions} />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Jasa List</h2>
                        <p className="text-sm text-gray-500">
                            Terdapat {totalJasa.toLocaleString("id-ID")} Jasa
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
                                <SelectTrigger className="h-9 w-35 rounded-lg border-gray-200 bg-white text-sm">
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

                {jasaHalamanIni.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-400">
                        {jasa.length === 0
                            ? "Belum ada jasa yang tersedia saat ini"
                            : "Tidak ada jasa yang cocok dengan filter ini"}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {jasaHalamanIni.map((j) => (
                            <JasaCard
                                key={j.id}
                                jasa={j}
                                initialFavorited={favoritIds.jasaIds.includes(j.jasaId)}
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

function FloatingIcon({ icon, className }: { icon: React.ReactNode; className?: string }) {
    return (
        <div className={cn("absolute flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow-md", className)}>
            {icon}
        </div>
    );
}