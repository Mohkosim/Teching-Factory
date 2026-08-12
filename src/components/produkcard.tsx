"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, Heart, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ProdukItem } from "@/types/interfaces/produk";
import Link from "next/link";

const rupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function ProdukCard({ produk }: { produk: ProdukItem }) {
    const router = useRouter();

    const namaJurusan = produk.nama_jurusan ?? produk.jurusan_id;
    const gambar = produk.gambar || produk.fotos[0] || "/images/placeholder-produk.png";
    const badge = produk.badge ?? produk.kondisi ?? produk.status;
    const sekolah = produk.sekolah ?? "";

    function handleClick() {
        sessionStorage.setItem("selectedProdukId", produk.produk_id);
        router.push("/produk/detail");
    }

    return (
        <Card
            onClick={handleClick}
            className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white p-0"
        >
            <div className="relative h-52 overflow-hidden bg-gray-50">
                <Image
                    src={gambar}
                    alt={produk.nama_produk}
                    fill
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className="absolute top-3 left-3 bg-sky-400 hover:bg-sky-500 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow">
                    {badge}
                </Badge>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow"
                >
                    <Heart size={14} className="text-gray-400 hover:text-red-400 transition-colors" />
                </button>
            </div>

            <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{produk.nama_produk}</h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{produk.sold_count} Terjual</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        Badge status:{" "}
                        <span className="text-sky-500 font-medium">{badge}</span>
                    </span>
                    <div className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-gray-700">
                            {produk.rating?.toFixed(1) ?? "0.0"}
                        </span>
                    </div>
                </div>

                <p className="text-end font-bold text-gray-900">{rupiah(produk.harga)}</p>

                <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(namaJurusan)}&background=0ea5e9&color=fff&size=32`}
                            />
                            <AvatarFallback className="bg-sky-100 text-sky-600 text-xs">
                                {namaJurusan.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{namaJurusan}</p>
                            <p className="text-xs text-gray-400 truncate leading-tight">{sekolah}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-md border border-gray-200 hover:border-sky-400 hover:text-sky-500 transition-colors duration-200"
                        >
                            <ShoppingCart size={14} className="text-gray-400 hover:text-sky-500" />
                        </button>
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-semibold border-sky-400 text-sky-500 hover:bg-sky-50 hover:text-sky-600 rounded-lg px-3 py-1 h-auto"
                        >
                            <Link href={`/produk/detail?id=${produk.produk_id}`}>Lihat Produk</Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}