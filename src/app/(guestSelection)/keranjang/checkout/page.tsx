"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

// ==== Types ====
interface OrderProduct {
    id: string;
    nama: string;
    variasi: string;
    harga: number;
    jumlah: number;
    thumbnail: string;
}

interface PaymentMethod {
    id: string;
    kode: string;
    nama: string;
}

// ==== Dummy data (nanti diganti data asli dari state/API) ====
const ALAMAT = {
    nama: "Nama",
    alamat: "Alamat Lengkap",
};

const PRODUK: OrderProduct[] = [
    {
        id: "prod-1",
        nama: "Kemeja Biru",
        variasi: "Warna Hijau",
        harga: 30000,
        jumlah: 1,
        thumbnail: "/dummy/kemeja.jpg",
    },
];

const METODE_PEMBAYARAN: PaymentMethod = {
    id: "bni",
    kode: "BNI",
    nama: "Bank Negara Indonesia",
};

const BIAYA_ONGKIR = 20000;

function formatRupiah(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function CheckoutPage() {
    const [produk] = useState<OrderProduct[]>(PRODUK);
    const [metodeBayar] = useState<PaymentMethod>(METODE_PEMBAYARAN);

    const subTotal = produk.reduce((sum, p) => sum + p.harga * p.jumlah, 0);
    const biayaOngkir = produk.length > 0 ? BIAYA_ONGKIR : 0;
    const total = subTotal + biayaOngkir;

    const handleUbahAlamat = () => {
        // TODO: sambungkan ke halaman/modal pilih alamat
        console.log("Ubah alamat pengirim");
    };

    const handlePilihMetodePembayaran = () => {
        // TODO: sambungkan ke halaman/modal pilih metode pembayaran
        console.log("Pilih metode pembayaran");
    };

    const handleBuatPesanan = () => {
        // TODO: sambungkan ke flow pembuatan pesanan sesungguhnya
        console.log("Buat pesanan:", { produk, metodeBayar, total });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 md:px-8">
            <div className="max-w-4xl mx-auto space-y-4">
                {/* Alamat Pengirim */}
                <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-4 h-4 text-gray-800" />
                        <h2 className="text-base font-bold text-gray-900">
                            Alamat Pengirim
                        </h2>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <span className="text-sm font-bold text-gray-900 w-20">
                                Nama
                            </span>
                            <span className="text-sm text-gray-700">{ALAMAT.alamat}</span>
                        </div>
                        <button
                            onClick={handleUbahAlamat}
                            className="text-sm font-semibold text-sky-400 hover:text-sky-500 transition-colors"
                        >
                            Pilih Alamat
                        </button>
                    </div>
                </div>

                {/* Produk Dipesan */}
                <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                    <h2 className="text-base font-bold text-gray-900 mb-4">
                        Produk Di pesan
                    </h2>

                    {/* Header tabel */}
                    <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-4 pb-3">
                        <span className="text-sm font-bold text-gray-900">Produk</span>
                        <span className="text-sm font-bold text-gray-900 text-center">
                            Harga Satuan
                        </span>
                        <span className="text-sm font-bold text-gray-900 text-center">
                            Jumlah
                        </span>
                        <span className="text-sm font-bold text-gray-900 text-center">
                            Subtotal Produk
                        </span>
                    </div>

                    {/* Baris produk */}
                    <div className="divide-y divide-gray-100">
                        {produk.map((item) => (
                            <div
                                key={item.id}
                                className="grid grid-cols-[2.2fr_1fr_1fr_1fr] items-center gap-4 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {item.nama}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Variasi:
                                            <br />
                                            {item.variasi}
                                        </p>
                                    </div>
                                </div>

                                <span className="text-sm text-gray-700 text-center">
                                    {formatRupiah(item.harga)}
                                </span>

                                <span className="text-sm text-gray-700 text-center">
                                    {item.jumlah}
                                </span>

                                <span className="text-sm font-medium text-gray-800 text-center">
                                    {formatRupiah(item.harga * item.jumlah)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Metode Pembayaran */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-900">
                                    Metode Pembayaran
                                </span>
                                <span className="text-xs font-semibold text-gray-700 border border-gray-300 rounded-md px-3 py-1">
                                    {metodeBayar.kode}
                                </span>
                            </div>
                            <button
                                onClick={handlePilihMetodePembayaran}
                                className="text-sm font-semibold text-sky-400 hover:text-sky-500 transition-colors"
                            >
                                Pilih metode pembayaran
                            </button>
                        </div>

                        <div className="border-t border-gray-100 pt-3 flex items-center gap-4">
                            <span className="text-sm font-semibold text-gray-800 w-10">
                                {metodeBayar.kode}
                            </span>
                            <span className="text-sm text-gray-700">{metodeBayar.nama}</span>
                        </div>
                    </div>

                    {/* Ringkasan & Checkout */}
                    <div className="mt-8 flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Sub Total</span>
                                <span className="text-gray-800">
                                    {formatRupiah(subTotal)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Biaya Ongkir</span>
                                <span className="text-gray-800">
                                    {formatRupiah(biayaOngkir)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-gray-900">Total</span>
                                <span className="text-gray-900">{formatRupiah(total)}</span>
                            </div>

                            <Button
                                onClick={handleBuatPesanan}
                                disabled={produk.length === 0}
                                className="w-full rounded-full bg-sky-400 hover:bg-sky-500 text-white font-semibold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                Buat Pesanan
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}