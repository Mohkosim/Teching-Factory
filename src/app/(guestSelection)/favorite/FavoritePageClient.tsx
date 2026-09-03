"use client";

import { useMemo, useState } from "react";
import { Heart } from "lucide-react";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ProdukCard from "@/components/produkcard";
import JasaCard from "@/components/jasa.card";
import type { TabKey } from "@/types/interfaces/favorite";
import type { ProdukPublicItem } from "@/lib/data/produk-public";
import type { JasaPublicItem } from "@/lib/data/jasa-public";

interface FavoritePageClientProps {
    produkFavorit: ProdukPublicItem[];
    jasaFavorit: JasaPublicItem[];
}

export default function FavoritePageClient({
    produkFavorit,
    jasaFavorit,
}: FavoritePageClientProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("produk");

    const produkFavoritTersaring = useMemo(() => {
        return [...produkFavorit].sort((a, b) => {
            const aHabis = a.stok <= 0 ? 1 : 0;
            const bHabis = b.stok <= 0 ? 1 : 0;
            return aHabis - bHabis;
        });
    }, [produkFavorit]);

    const activeList = activeTab === "produk" ? produkFavoritTersaring : jasaFavorit;

    return (
        <div className="min-h-screen py-6 px-4 md:px-8">
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
                <h1 className="text-lg font-bold text-gray-900 mb-4">Favorit</h1>

                <div className="flex items-center gap-2 border-b border-gray-100 mb-6">
                    <TabButton
                        label={`Produk (${produkFavorit.length})`}
                        active={activeTab === "produk"}
                        onClick={() => setActiveTab("produk")}
                    />
                    <TabButton
                        label={`Jasa (${jasaFavorit.length})`}
                        active={activeTab === "jasa"}
                        onClick={() => setActiveTab("jasa")}
                    />
                </div>

                {activeList.length === 0 ? (
                    <EmptyFavorite tipe={activeTab} />
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {activeTab === "produk"
                            ? produkFavoritTersaring.map((item) => (
                                <ProdukCard key={item.id} product={item} initialFavorited={true} />
                            ))
                            : jasaFavorit.map((item) => (
                                <JasaCard key={item.id} jasa={item} initialFavorited={true} />
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}

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
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${active
                ? "border-sky-400 text-sky-500"
                : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
        >
            {label}
        </button>
    );
}

function EmptyFavorite({ tipe }: { tipe: TabKey }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Heart className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">Belum ada {tipe === "produk" ? "produk" : "jasa"} favorit</p>
        </div>
    );
}