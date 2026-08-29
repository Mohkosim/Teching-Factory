"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import { Star, Heart, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { tambahKeKeranjang } from "@/lib/api/keranjang";
import { toggleFavoritProduk } from "@/lib/api/favorit";
import { cn } from "@/lib/utils";
import type { ProdukPublicItem } from "@/lib/data/produk-public";

const rupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function ProdukCard({
    product,
    initialFavorited = false,
}: {
    product: ProdukPublicItem;
    initialFavorited?: boolean;
}) {
    const router = useRouter();
    const [favorited, setFavorited] = useState(initialFavorited);
    const [addingToCart, setAddingToCart] = useState(false);
    const stokHabis = product.stok <= 0;

    function handleClickCard() {
        if (stokHabis) return;
        router.push(`/produk/detail?id=${product.id}`);
    }

    async function handleAddToCart(e: React.MouseEvent) {
        e.stopPropagation();
        if (stokHabis) return;
        setAddingToCart(true);
        tampilkanLoading("Menambahkan ke keranjang...");
        try {
            const res = await tambahKeKeranjang(product.id);
            Swal.close();
            if (res.ok) {
                toast.success(`${product.nama} ditambahkan ke keranjang`);
            } else {
                toast.error(res.status === 401 ? "Silakan login untuk menambah ke keranjang" : "Gagal menambahkan ke keranjang");
            }
        } catch {
            Swal.close();
            toast.error("Gagal menambahkan ke keranjang");
        } finally {
            setAddingToCart(false);
        }
    }

    async function handleToggleFavorite(e: React.MouseEvent) {
        e.stopPropagation();
        const sebelumnya = favorited;
        setFavorited(!sebelumnya);
        tampilkanLoading(!sebelumnya ? "Menambahkan ke favorit..." : "Menghapus dari favorit...");
        try {
            const res = await toggleFavoritProduk(product.id);
            Swal.close();
            if (!res.ok) {
                setFavorited(sebelumnya);
                toast.error(res.status === 401 ? "Silakan login untuk menambah favorit" : "Gagal memperbarui favorit");
                return;
            }
            toast.success(!sebelumnya ? "Ditambahkan ke favorit" : "Dihapus dari favorit");
        } catch {
            setFavorited(sebelumnya);
            Swal.close();
            toast.error("Gagal memperbarui favorit");
        }
    }

    return (
        <Card
            onClick={handleClickCard}
            className={cn(
                "group rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white p-0 transition-shadow duration-300",
                stokHabis
                    ? "opacity-60 grayscale cursor-not-allowed"
                    : "cursor-pointer hover:shadow-md"
            )}
        >
            <div className="relative h-52 overflow-hidden bg-gray-50">
                <Image
                    src={product.gambar || "/images/placeholder-produk.png"}
                    alt={product.nama}
                    fill
                    className={cn(
                        "w-full h-full object-cover transition-transform duration-500",
                        !stokHabis && "group-hover:scale-105"
                    )}
                />
                <Badge
                    className={cn(
                        "absolute top-3 left-3 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow",
                        stokHabis ? "bg-gray-400 hover:bg-gray-400" : "bg-sky-400 hover:bg-sky-500"
                    )}
                >
                    {stokHabis ? "Stok Habis" : product.badge}
                </Badge>
                <button
                    onClick={handleToggleFavorite}
                    disabled={stokHabis}
                    className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Heart size={14} className={favorited ? "text-red-500 fill-red-500" : "text-gray-400 hover:text-red-400 transition-colors"} />
                </button>
            </div>

            <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{product.nama}</h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{product.terjual} Terjual</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 truncate min-w-0 flex-1" title={product.deskripsi || "-"}>
                        {product.deskripsi || "-"}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-gray-700">{product.rating?.toFixed(1) ?? "0.0"}</span>
                    </div>
                </div>

                <p className="text-end font-bold text-gray-900">{rupiah(product.harga)}</p>

                <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(product.jurusan)}&background=0ea5e9&color=fff&size=32`} />
                            <AvatarFallback className="bg-sky-100 text-sky-600 text-xs">{product.jurusan.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{product.jurusan}</p>
                            <p className="text-xs text-gray-400 truncate leading-tight">{product.sekolah}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={handleAddToCart}
                            disabled={addingToCart || stokHabis}
                            className="p-1.5 rounded-md border border-gray-200 hover:border-sky-400 hover:text-sky-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-400"
                        >
                            <ShoppingCart size={14} className="text-gray-400 hover:text-sky-500" />
                        </button>
                        {stokHabis ? (
                            <span className="text-xs font-semibold text-gray-400 border border-gray-200 rounded-lg px-3 py-1 cursor-not-allowed">
                                Stok Habis
                            </span>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-semibold border-sky-400 text-sky-500 hover:bg-sky-50 hover:text-sky-600 rounded-lg px-3 py-1 h-auto"
                            >
                                <Link href={`/produk/detail?id=${product.id}`}>Lihat Produk</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}