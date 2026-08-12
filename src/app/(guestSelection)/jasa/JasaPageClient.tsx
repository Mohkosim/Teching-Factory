"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ShoppingBag, Star, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import FilterJasa, { FilterJasaValue, emptyFilterJasaValue } from "@/components/filter/jasa/filter";
import type { JasaPublicItem } from "@/lib/data/jasa-public";
import Pagination from "@/components/pagination/Pagination";

const rupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type UrutanToolbar = "default" | "termurah" | "termahal" | "terlaris";

export default function JasaPageClient({ jasa }: { jasa: JasaPublicItem[] }) {
    const [halaman, setHalaman] = useState(1);
    const [perHalaman, setPerHalaman] = useState(12);

    const [filter, setFilter] = useState<FilterJasaValue>(emptyFilterJasaValue);
    const [urutanToolbar, setUrutanToolbar] = useState<UrutanToolbar>("default");

    const jasaTersaring = useMemo(() => {
        let hasil = jasa.filter((j) => {
            // NOTE: filter.tipeLayanan belum bisa dicocokkan — field ini belum ada di schema/JasaPublicItem.
            const matchLokasi = filter.lokasi.length === 0 || (j.lokasi ? filter.lokasi.includes(j.lokasi) : false);
            const matchRating = filter.rating === null || j.rating >= filter.rating;
            const matchHargaMin = filter.hargaMin === "" || j.harga >= Number(filter.hargaMin);
            const matchHargaMax = filter.hargaMax === "" || j.harga <= Number(filter.hargaMax);

            return matchLokasi && matchRating && matchHargaMin && matchHargaMax;
        });

        if (urutanToolbar === "termurah") {
            hasil = [...hasil].sort((a, b) => a.harga - b.harga);
        } else if (urutanToolbar === "termahal") {
            hasil = [...hasil].sort((a, b) => b.harga - a.harga);
        } else if (urutanToolbar === "terlaris") {
            hasil = [...hasil].sort((a, b) => b.dipesan - a.dipesan);
        }

        return hasil;
    }, [filter, urutanToolbar, jasa]);

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
                                className="border-0 pl-9 shadow-none focus-visible:ring-0"
                            />
                        </div>

                        <div className="hidden h-8 w-px bg-gray-200 sm:block" />

                        <FilterJasa value={filter} onApply={setFilter} />
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
                            <JasaCard key={j.id} jasa={j} />
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

function JasaCard({ jasa }: { jasa: JasaPublicItem }) {
    return (
        <Card className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white p-0">
            <div className="relative h-52 overflow-hidden bg-gray-50">
                <Image
                    src={jasa.gambar}
                    alt={jasa.nama}
                    fill
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {jasa.estimasiPengerjaan && (
                    <Badge className="absolute top-3 left-3 bg-sky-400 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                        {jasa.estimasiPengerjaan}
                    </Badge>
                )}
                <button className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow">
                    <Heart size={14} className="text-gray-400 hover:text-red-400 transition-colors" />
                </button>
            </div>

            <CardContent className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{jasa.nama}</h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{jasa.dipesan} Project Selesai</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 truncate">
                        Estimasi Pengerjaan:{" "}
                        <span className="text-gray-600 font-medium">{jasa.estimasiPengerjaan ?? "-"}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-gray-700">{jasa.rating.toFixed(1)}</span>
                    </div>
                </div>

                <p className="text-end font-bold text-gray-900">{rupiah(jasa.harga)}</p>

                <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(jasa.jurusan)}&background=0ea5e9&color=fff&size=32`}
                            />
                            <AvatarFallback className="bg-sky-100 text-sky-600 text-xs">
                                {jasa.jurusan.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{jasa.jurusan}</p>
                            <p className="text-xs text-gray-400 truncate leading-tight">{jasa.sekolah}</p>
                        </div>
                    </div>

                    <Link href={`/jasa/detail?id=${jasa.id}`} className="shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-semibold border-sky-400 text-sky-500 hover:bg-sky-50 hover:text-sky-600 rounded-lg px-3 py-1 h-auto"
                        >
                            Lihat Jasa
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

function FloatingIcon({ icon, className }: { icon: React.ReactNode; className?: string }) {
    return (
        <div className={cn("absolute flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow-md", className)}>
            {icon}
        </div>
    );
}