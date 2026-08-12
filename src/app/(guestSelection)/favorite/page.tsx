"use client";

import { useState } from "react";
import { Heart, ShoppingCart, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// ==== Types ====
interface FavoriteProduct {
    id: string;
    tipe: "produk";
    toko: string;
    nama: string;
    harga: number;
    thumbnail: string;
}

interface FavoriteJasa {
    id: string;
    tipe: "jasa";
    toko: string;
    nama: string;
    harga: number;
    satuan: string; // contoh: "/jam", "/pengerjaan"
    estimasi: string; // contoh: "1-2 hari"
    thumbnail: string;
}

type FavoriteItem = FavoriteProduct | FavoriteJasa;

// ==== Dummy data (nanti diganti fetch API favorit asli) ====
const DUMMY_FAVORITES: FavoriteItem[] = [
    {
        id: "fav-1",
        tipe: "produk",
        toko: "Toko Kemeja Jaya",
        nama: "Kemeja Biru",
        harga: 30000,
        thumbnail: "/dummy/kemeja.jpg",
    },
    {
        id: "fav-2",
        tipe: "produk",
        toko: "SMK Karya Mandiri Store",
        nama: "Celana Panjang Hitam",
        harga: 45000,
        thumbnail: "/dummy/celana.jpg",
    },
    {
        id: "fav-3",
        tipe: "produk",
        toko: "Toko Kemeja Jaya",
        nama: "Kaos Polos Putih",
        harga: 25000,
        thumbnail: "/dummy/kaos.jpg",
    },
    {
        id: "fav-4",
        tipe: "jasa",
        toko: "SMK Karya Mandiri Store",
        nama: "Jasa Permak Celana",
        harga: 15000,
        satuan: "/item",
        estimasi: "1-2 hari",
        thumbnail: "/dummy/jasa-permak.jpg",
    },
    {
        id: "fav-5",
        tipe: "jasa",
        toko: "Toko Kemeja Jaya",
        nama: "Jasa Sablon Custom",
        harga: 50000,
        satuan: "/desain",
        estimasi: "3-5 hari",
        thumbnail: "/dummy/jasa-sablon.jpg",
    },
];

function formatRupiah(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

type TabKey = "produk" | "jasa";

export default function FavoritePage() {
    const [favorites, setFavorites] = useState<FavoriteItem[]>(DUMMY_FAVORITES);
    const [activeTab, setActiveTab] = useState<TabKey>("produk");

    const removeFavorite = (id: string) => {
        setFavorites((prev) => prev.filter((item) => item.id !== id));
    };

    const handleAddToCart = (item: FavoriteProduct) => {
        // TODO: sambungkan ke fitur tambah ke keranjang sesungguhnya
        console.log("Tambah ke keranjang:", item.nama);
    };

    const handlePesanJasa = (item: FavoriteJasa) => {
        // TODO: sambungkan ke fitur pesan/order jasa sesungguhnya
        console.log("Pesan jasa:", item.nama);
    };

    const handleChatToko = (tokoName: string) => {
        // TODO: sambungkan ke fitur chat toko
        console.log("Chat toko:", tokoName);
    };

    const produkList = favorites.filter(
        (item): item is FavoriteProduct => item.tipe === "produk"
    );
    const jasaList = favorites.filter(
        (item): item is FavoriteJasa => item.tipe === "jasa"
    );

    const activeList = activeTab === "produk" ? produkList : jasaList;

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 md:px-8">
            {/* Breadcrumb */}
            <div className="max-w-6xl mx-auto flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Toko</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Favorit</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm p-6 md:p-8">
                <h1 className="text-lg font-bold text-gray-900 mb-4">
                    Favorit
                </h1>

                {/* Tab Produk / Jasa */}
                <div className="flex items-center gap-2 border-b border-gray-100 mb-6">
                    <TabButton
                        label={`Produk (${produkList.length})`}
                        active={activeTab === "produk"}
                        onClick={() => setActiveTab("produk")}
                    />
                    <TabButton
                        label={`Jasa (${jasaList.length})`}
                        active={activeTab === "jasa"}
                        onClick={() => setActiveTab("jasa")}
                    />
                </div>

                {activeList.length === 0 ? (
                    <EmptyFavorite tipe={activeTab} />
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {activeTab === "produk"
                            ? produkList.map((item) => (
                                  <ProductCard
                                      key={item.id}
                                      item={item}
                                      onRemove={removeFavorite}
                                      onAddToCart={handleAddToCart}
                                  />
                              ))
                            : jasaList.map((item) => (
                                  <JasaCard
                                      key={item.id}
                                      item={item}
                                      onRemove={removeFavorite}
                                      onPesan={handlePesanJasa}
                                      onChat={handleChatToko}
                                  />
                              ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==== Tab Button ====
function TabButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                active
                    ? "border-sky-400 text-sky-500"
                    : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
        >
            {label}
        </button>
    );
}

// ==== Card Produk ====
function ProductCard({
    item,
    onRemove,
    onAddToCart,
}: {
    item: FavoriteProduct;
    onRemove: (id: string) => void;
    onAddToCart: (item: FavoriteProduct) => void;
}) {
    return (
        <div className="group relative border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <button
                onClick={() => onRemove(item.id)}
                title="Hapus dari favorit"
                className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
            >
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            </button>

            <div className="aspect-square bg-gray-200" />

            <div className="p-3">
                <p className="text-xs text-gray-400 mb-1 truncate">{item.toko}</p>
                <p className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[2.5rem]">
                    {item.nama}
                </p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                    {formatRupiah(item.harga)}
                </p>

                <Button
                    onClick={() => onAddToCart(item)}
                    className="w-full mt-3 rounded-full bg-sky-400 hover:bg-sky-500 text-white font-semibold text-xs py-2 h-auto flex items-center justify-center gap-1.5"
                >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Tambah ke Keranjang
                </Button>
            </div>
        </div>
    );
}

// ==== Card Jasa ====
function JasaCard({
    item,
    onRemove,
    onPesan,
    onChat,
}: {
    item: FavoriteJasa;
    onRemove: (id: string) => void;
    onPesan: (item: FavoriteJasa) => void;
    onChat: (tokoName: string) => void;
}) {
    return (
        <div className="group relative border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <button
                onClick={() => onRemove(item.id)}
                title="Hapus dari favorit"
                className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
            >
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            </button>

            <div className="aspect-square bg-gray-200" />

            <div className="p-3">
                <p className="text-xs text-gray-400 mb-1 truncate">{item.toko}</p>
                <p className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[2.5rem]">
                    {item.nama}
                </p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                    {formatRupiah(item.harga)}
                    <span className="text-xs font-normal text-gray-400">
                        {item.satuan}
                    </span>
                </p>
                <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Clock className="w-3 h-3" />
                    Estimasi {item.estimasi}
                </p>

                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => onChat(item.toko)}
                        title="Chat Toko"
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
                    >
                        <MessageCircle className="w-4 h-4" />
                    </button>
                    <Button
                        onClick={() => onPesan(item)}
                        className="flex-1 rounded-full bg-sky-400 hover:bg-sky-500 text-white font-semibold text-xs py-2 h-auto"
                    >
                        Pesan Jasa
                    </Button>
                </div>
            </div>
        </div>
    );
}

function EmptyFavorite({ tipe }: { tipe: TabKey }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Heart className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">
                Belum ada {tipe === "produk" ? "produk" : "jasa"} favorit
            </p>
        </div>
    );
}