"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Minus, Plus, MessageCircle, Trash2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { confirmHapus, tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import { ubahJumlahKeranjang, hapusDariKeranjang } from "@/lib/api/keranjang";
import type { KeranjangItem } from "@/types/interfaces/keranjang";

function formatRupiah(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function KeranjangClient({ initialItems }: { initialItems: KeranjangItem[] }) {
    const router = useRouter();

    const [items, setItems] = useState<KeranjangItem[]>(initialItems);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        () => new Set(initialItems.map((i) => i.id))
    );

    const groupedByToko = useMemo(() => {
        const map = new Map<string, KeranjangItem[]>();
        items.forEach((item) => {
            if (!map.has(item.toko)) map.set(item.toko, []);
            map.get(item.toko)!.push(item);
        });
        return Array.from(map.entries());
    }, [items]);

    const allSelected = items.length > 0 && selectedIds.size === items.length;

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? new Set() : new Set(items.map((i) => i.id)));
    };

    const toggleSelectItem = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectToko = (tokoItems: KeranjangItem[]) => {
        const tokoAllSelected = tokoItems.every((i) => selectedIds.has(i.id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            tokoItems.forEach((i) => {
                if (tokoAllSelected) {
                    next.delete(i.id);
                } else {
                    next.add(i.id);
                }
            });
            return next;
        });
    };

    const handleChatPenjual = (tokoName: string) => {
        // TODO: sambungkan ke fitur chat/hubungi penjual
        console.log("Chat dengan toko:", tokoName);
    };

    const handleUpdateQuantity = async (item: KeranjangItem, delta: number) => {
        if (item.kuantitas + delta < 1) return;
        if (delta > 0 && item.kuantitas + delta > item.stok) return;

        const sebelumnya = items;
        setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, kuantitas: i.kuantitas + delta } : i))
        );

        tampilkanLoading("Memperbarui jumlah...");
        try {
            const res = await ubahJumlahKeranjang(item.id, delta);
            Swal.close();
            if (!res.ok) {
                setItems(sebelumnya);
                toast.error("Gagal memperbarui jumlah produk");
                return;
            }
            toast.success("Jumlah produk berhasil diperbarui");
        } catch {
            setItems(sebelumnya);
            Swal.close();
            toast.error("Gagal memperbarui jumlah produk");
        }
    };

    const handleRemoveItem = async (id: string, nama: string) => {
        const konfirmasi = await confirmHapus(nama);
        if (!konfirmasi) return;

        const sebelumnya = items;
        setItems((prev) => prev.filter((item) => item.id !== id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

        tampilkanLoading("Menghapus produk...");
        try {
            const res = await hapusDariKeranjang(id);
            Swal.close();
            if (!res.ok) {
                setItems(sebelumnya);
                toast.error("Gagal menghapus produk dari keranjang");
                return;
            }
            toast.success("Produk berhasil dihapus dari keranjang");
        } catch {
            setItems(sebelumnya);
            Swal.close();
            toast.error("Gagal menghapus produk dari keranjang");
        }
    };

    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    const subTotal = selectedItems.reduce(
        (sum, item) => sum + item.harga * item.kuantitas,
        0
    );
    const total = subTotal;

    const handleCheckout = () => {
        if (selectedItems.length === 0) return;
        const ids = selectedItems.map((item) => item.id).join(",");
        router.push(`/keranjang/checkout?items=${encodeURIComponent(ids)}`);
    };

    return (
        <div className="min-h-screen py-6 px-4 md:px-8">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm p-6 md:p-8">
                {items.length === 0 ? (
                    <EmptyCart />
                ) : (
                    <>
                        <div className="grid grid-cols-[24px_2.2fr_1fr_1fr_1fr_0.6fr] items-center gap-4 pb-4 mb-2 border-b border-gray-100">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 accent-blue-500 cursor-pointer"
                            />
                            <span className="text-base font-bold text-gray-900">
                                Pilih Semua Produk
                            </span>
                            <span className="text-sm font-bold text-gray-900 text-center">Harga Satuan</span>
                            <span className="text-sm font-bold text-gray-900 text-center">Kuantitas</span>
                            <span className="text-sm font-bold text-gray-900 text-center">Total Harga</span>
                            <span className="text-sm font-bold text-gray-900 text-center">Aksi</span>
                        </div>

                        <div className="space-y-6">
                            {groupedByToko.map(([tokoName, tokoItems]) => {
                                const tokoAllSelected = tokoItems.every((i) => selectedIds.has(i.id));

                                return (
                                    <div key={tokoName} className="border border-gray-100 rounded-xl overflow-hidden">
                                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={tokoAllSelected}
                                                onChange={() => toggleSelectToko(tokoItems)}
                                                className="w-4 h-4 rounded border-gray-300 accent-blue-500 cursor-pointer"
                                            />
                                            <Store className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm font-semibold text-gray-800">{tokoName}</span>
                                            <button
                                                onClick={() => handleChatPenjual(tokoName)}
                                                className="ml-auto flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                Chat Toko
                                            </button>
                                        </div>

                                        <div className="divide-y divide-gray-100">
                                            {tokoItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="grid grid-cols-[24px_2.2fr_1fr_1fr_1fr_0.6fr] items-center gap-4 px-4 py-4"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(item.id)}
                                                        onChange={() => toggleSelectItem(item.id)}
                                                        className="w-4 h-4 rounded border-gray-300 accent-blue-500 cursor-pointer"
                                                    />

                                                    <div className="flex items-center gap-3">
                                                        <div className="relative w-14 h-14 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                                                            {item.thumbnail ? (
                                                                <Image
                                                                    src={item.thumbnail}
                                                                    alt={item.nama}
                                                                    fill
                                                                    className="object-cover"
                                                                    unoptimized
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-800">{item.nama}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                Stok tersedia: {item.stok ?? 0}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span className="text-sm text-gray-700 text-center">
                                                        {formatRupiah(item.harga)}
                                                    </span>

                                                    <div className="flex justify-center">
                                                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                                            <button
                                                                onClick={() => handleUpdateQuantity(item, -1)}
                                                                disabled={item.kuantitas <= 1}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                            <span className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-800 border-x border-gray-200">
                                                                {item.kuantitas}
                                                            </span>
                                                            <button
                                                                onClick={() => handleUpdateQuantity(item, 1)}
                                                                disabled={item.kuantitas >= item.stok}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <span className="text-sm font-medium text-gray-800 text-center">
                                                        {formatRupiah(item.harga * item.kuantitas)}
                                                    </span>

                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => handleRemoveItem(item.id, item.nama)}
                                                            title="Hapus dari keranjang"
                                                            className="text-red-500 hover:text-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 space-y-1.5">
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-gray-900">Total</span>
                                <span className="text-gray-900">{formatRupiah(total)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <Button
                                onClick={handleCheckout}
                                disabled={selectedItems.length === 0}
                                className="w-full max-w-sm rounded-full bg-sky-400 hover:bg-sky-500 text-white font-semibold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Checkout
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyCart() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-sm">Keranjang kamu masih kosong</p>
        </div>
    );
}