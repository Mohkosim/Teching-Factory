"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import {
    Search,
    ShoppingBag,
    Star,
    Heart,
    ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Filter, { FilterValue, emptyFilterValue } from "@/components/filter/produk/filter";
import Sorting, { SortOption } from "@/components/filter/produk/sorting";
import type { ProdukPublicItem} from "@/lib/data/produk-public";
import Pagination from "@/components/pagination/Pagination";

const rupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type UrutanToolbar = "default" | "termurah" | "termahal" | "terlaris";

export default function ProdukPageClient({ produk }: { produk: ProdukPublicItem[] }) {
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
            {/* Hero */}
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

                        <Filter value={filter} onApply={setFilter} />

                        <div className="hidden h-8 w-px bg-gray-200 sm:block" />

                        <Sorting value={sort} onApply={setSort} />
                    </div>
                </div>
            </section>

            {/* Konten */}
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
                            <ProdukCard key={p.id} product={p} />
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

function ProdukCard({ product }: { product: ProdukPublicItem }) {
    return (
        <Card className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white p-0">
            <div className="relative h-52 overflow-hidden bg-gray-50">
                <Image
                    src={product.gambar}
                    alt={product.nama}
                    fill
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className="absolute top-3 left-3 bg-sky-400 hover:bg-sky-500 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow">
                    {product.badge}
                </Badge>
                <button className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow">
                    <Heart size={14} className="text-gray-400 hover:text-red-400 transition-colors" />
                </button>
            </div>

            <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{product.nama}</h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{product.terjual} Terjual</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        Badge status:{" "}
                        <span className="text-sky-500 font-medium">{product.badge}</span>
                    </span>
                    <div className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-gray-700">
                            {product.rating?.toFixed(1) ?? "0.0"}
                        </span>
                    </div>
                </div>

                <p className="text-end font-bold text-gray-900">{rupiah(product.harga)}</p>

                <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(product.jurusan)}&background=0ea5e9&color=fff&size=32`}
                            />
                            <AvatarFallback className="bg-sky-100 text-sky-600 text-xs">
                                {product.jurusan.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{product.jurusan}</p>
                            <p className="text-xs text-gray-400 truncate leading-tight">{product.sekolah}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button className="p-1.5 rounded-md border border-gray-200 hover:border-sky-400 hover:text-sky-500 transition-colors duration-200">
                            <ShoppingCart size={14} className="text-gray-400 hover:text-sky-500" />
                        </button>
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-xs font-semibold border-sky-400 text-sky-500 hover:bg-sky-50 hover:text-sky-600 rounded-lg px-3 py-1 h-auto"
                        >
                            <Link href={`/produk/detail?id=${product.id}`}>Lihat Produk</Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
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