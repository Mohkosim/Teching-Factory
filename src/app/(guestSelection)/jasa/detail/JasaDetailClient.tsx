"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Star,
    Heart,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { JasaPublicItem } from "@/lib/data/jasa-public";

const rupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type TabDetail = "deskripsi" | "portofolio" | "review";

const DAFTAR_TAB: { key: TabDetail; label: string }[] = [
    { key: "deskripsi", label: "Deskripsi" },
    { key: "portofolio", label: "Portofolio" },
    { key: "review", label: "Review" },
];

export default function JasaDetailClient({
    jasa,
    rekomendasi,
}: {
    jasa: JasaPublicItem;
    rekomendasi: JasaPublicItem[];
}) {
    const [gambarAktif, setGambarAktif] = useState(0);
    const [tabAktif, setTabAktif] = useState<TabDetail>("deskripsi");

    const galeri = jasa.fotos.length > 0 ? jasa.fotos : [jasa.gambar];

    const geserGaleri = (arah: 1 | -1) => {
        setGambarAktif((i) => (i + arah + galeri.length) % galeri.length);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Breadcrumb */}
                <nav className="mb-4 text-xs text-gray-400">
                    <Link href="/" className="hover:text-sky-500">Toko</Link>
                    <span className="mx-1.5">›</span>
                    <Link href="/jasa" className="hover:text-sky-500">Jasa</Link>
                    <span className="mx-1.5">›</span>
                    <span className="text-gray-500">Detail</span>
                </nav>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Galeri */}
                    <div>
                        <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-gray-100">
                            <Image
                                src={galeri[gambarAktif]}
                                alt={jasa.nama}
                                fill
                                className="object-cover"
                            />
                        </div>

                        {galeri.length > 1 && (
                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    onClick={() => geserGaleri(-1)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <div className="flex flex-1 gap-2 overflow-x-auto">
                                    {galeri.map((src, i) => (
                                        <button
                                            key={src + i}
                                            onClick={() => setGambarAktif(i)}
                                            className={cn(
                                                "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2",
                                                gambarAktif === i ? "border-sky-500" : "border-transparent"
                                            )}
                                        >
                                            <Image src={src} alt={`${jasa.nama} ${i + 1}`} fill className="object-cover" />
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => geserGaleri(1)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-500">{jasa.jurusan}</p>
                        <p className="text-sm font-bold text-gray-700">{jasa.sekolah}</p>

                        <h1 className="text-2xl font-bold uppercase text-gray-900 sm:text-3xl">{jasa.nama}</h1>

                        <p className="text-xl font-bold text-gray-900">{rupiah(jasa.harga)}</p>

                        <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold text-gray-700">{jasa.rating.toFixed(1)}</span>
                            <span className="text-xs text-gray-400">
                                ({jasa.jumlahReview.toLocaleString("id-ID")} Review)
                            </span>
                        </div>

                        <p className="text-sm leading-relaxed text-gray-500">{jasa.deskripsi}</p>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <Button className="gap-2 rounded-full bg-green-500 px-6 hover:bg-green-600">
                                <MessageCircle className="h-4 w-4" />
                                Hubungi Penyedia Jasa
                            </Button>
                            <Button variant="outline" className="gap-2 rounded-full border-gray-300 px-6">
                                <ClipboardList className="h-4 w-4" />
                                Form Pemesanan
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-1 pt-3 text-xs text-gray-500">
                            <span>Estimasi Pengerjaan : {jasa.estimasiPengerjaan ?? "-"}</span>
                            <span>Project Selesai : {jasa.dipesan}</span>
                        </div>
                    </div>
                </div>

                {/* Tab */}
                <div className="mt-10">
                    <div className="flex gap-2">
                        {DAFTAR_TAB.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setTabAktif(tab.key)}
                                className={cn(
                                    "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                                    tabAktif === tab.key
                                        ? "bg-sky-500 text-white"
                                        : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        {tabAktif === "deskripsi" && (
                            <p className="text-sm leading-relaxed text-gray-500">{jasa.deskripsi}</p>
                        )}
                        {tabAktif === "portofolio" && (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {galeri.map((src, i) => (
                                    <div key={src + i} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                                        <Image src={src} alt={`Portofolio ${i + 1}`} fill className="object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}
                        {tabAktif === "review" && (
                            <p className="text-sm text-gray-400">Belum ada review untuk jasa ini.</p>
                        )}
                    </div>
                </div>

                {/* Rekomendasi */}
                {rekomendasi.length > 0 && (
                    <div className="mt-14">
                        <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">
                            Rekomendasi Untuk Anda
                        </h2>

                        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {rekomendasi.map((j) => (
                                <RekomendasiCard key={j.id} jasa={j} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function RekomendasiCard({ jasa }: { jasa: JasaPublicItem }) {
    return (
        <Card className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white p-0">
            <div className="relative h-40 overflow-hidden bg-gray-50">
                <Image
                    src={jasa.gambar}
                    alt={jasa.nama}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className="absolute top-3 left-3 bg-sky-400 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                    Jasa
                </Badge>
                <button className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow">
                    <Heart size={14} className="text-gray-400 hover:text-red-400 transition-colors" />
                </button>
            </div>

            <CardContent className="p-4 space-y-1.5">
                <h3 className="font-bold text-gray-900 text-sm leading-tight">{jasa.nama}</h3>

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
                        <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{jasa.jurusan}</p>
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