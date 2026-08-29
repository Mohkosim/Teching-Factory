"use client";

import { useState, useMemo } from "react";
import { MapPin, Plus, Check, Truck, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmHapus, tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { getAlamatList, createAlamat, updateAlamat, deleteAlamat } from "@/lib/api/profile-api";
import { batalkanPesananCheckout, buatPesanan } from "@/lib/api/checkout-api";
import { useMidtransSnap } from "@/lib/hooks/useMidtransSnap";
import type { AlamatData } from "@/types/interfaces/alamat";
import type { KeranjangItem } from "@/types/interfaces/keranjang";
import dynamic from "next/dynamic";
import type { ReverseGeocodeResult } from "@/components/AddressMapPicker";
import { getOngkosKirim, searchOngkirDestination, type OngkirDestination } from "@/lib/api/ongkir-api";

interface JasaPengiriman {
    id: string;
    kurir: string;
    layanan: string;
    estimasi: string;
    harga: number;
}

// Metode pembayaran TIDAK lagi dipilih manual di sini — snap.pay() dibuka tanpa
// enabled_payments dibatasi, jadi Midtrans Snap sendiri yang menampilkan daftar
// channel yang aktif di dashboard (VA, e-wallet, QRIS, dll), sama seperti
// tampilan asli Snap. Ini juga yang bikin flow "pesanan sudah dibuat tapi belum
// dibayar" (lihat pesananBelumBayar) jadi penting: user boleh ganti pikiran soal
// channel pembayaran langsung dari popup Snap tanpa harus batal dari awal.

const initialForm = {
    nama_penerima: "",
    nomor_telepon: "",
    alamat_lengkap: "",
    kota: "",
    kecamatan: "",
    provinsi: "",
    kota_id: null as number | null,
    kode_pos: "",
    isUtama: false,
};

const AddressMapPicker = dynamic(
    () => import("@/components/AddressMapPicker"),
    { ssr: false, loading: () => <div className="h-64 rounded-xl bg-gray-100 animate-pulse" /> }
);

function formatRupiah(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function CheckoutClient({
    initialProduk,
    initialAlamatList,
}: {
    initialProduk: KeranjangItem[];
    initialAlamatList: AlamatData[];
}) {
    const snapReady = useMidtransSnap();
    const [produk] = useState<KeranjangItem[]>(initialProduk);
    const [creating, setCreating] = useState(false);

    const [alamatList, setAlamatList] = useState<AlamatData[]>(initialAlamatList);
    const [selectedAlamat, setSelectedAlamat] = useState<AlamatData | null>(
        () => initialAlamatList.find((a) => a.isUtama) ?? initialAlamatList[0] ?? null
    );

    const [isPilihDialogOpen, setIsPilihDialogOpen] = useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(initialForm);

    const [isJasaDialogOpen, setIsJasaDialogOpen] = useState(false);
    const [loadingJasa, setLoadingJasa] = useState(false);
    const [jasaList, setJasaList] = useState<JasaPengiriman[]>([]);
    const [selectedJasa, setSelectedJasa] = useState<JasaPengiriman | null>(null);
    const [destinationOptions, setDestinationOptions] = useState<{
        kota: OngkirDestination[];
        kecamatan: OngkirDestination[];
    }>({ kota: [], kecamatan: [] });
    const [searchingDestination, setSearchingDestination] = useState({ kota: false, kecamatan: false });

    // Pesanan yang sudah dibuat (Snap token & kode invoice sudah ada) tapi popup Snap
    // ditutup sebelum pembayaran selesai. Selama tidak null, dialog konfirmasi tampil.
    const [pesananBelumBayar, setPesananBelumBayar] = useState<{
        kodeInvoice: string;
        snapToken: string;
    } | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const groupedByToko = useMemo(() => {
        const map = new Map<string, KeranjangItem[]>();
        for (const item of produk) {
            const list = map.get(item.tokoId) ?? [];
            list.push(item);
            map.set(item.tokoId, list);
        }
        return Array.from(map.entries()).map(([tokoId, items]) => ({
            tokoId,
            tokoNama: items[0].toko,
            jurusanId: items[0].jurusanId,
            items,
            subtotal: items.reduce((s, p) => s + p.harga * p.kuantitas, 0),
        }));
    }, [produk]);

    const subTotal = produk.reduce((sum, p) => sum + p.harga * p.kuantitas, 0);
    const biayaOngkir = produk.length > 0 ? selectedJasa?.harga ?? 0 : 0;
    const total = subTotal + biayaOngkir;

    const handlePilihAlamat = (alamat: AlamatData) => {
        setSelectedAlamat(alamat);
        setIsPilihDialogOpen(false);
        setJasaList([]);
        setSelectedJasa(null);
    };

    const openTambahAlamatForm = () => {
        setForm(initialForm);
        setIsFormDialogOpen(true);
    };

    const openEditAlamatForm = (alamat: AlamatData) => {
        setEditingId(alamat.alamat_id);
        setForm({
            nama_penerima: alamat.nama_penerima,
            nomor_telepon: alamat.nomor_telepon,
            alamat_lengkap: alamat.alamat_lengkap,
            kota: alamat.kota,
            kecamatan: alamat.kecamatan,
            provinsi: alamat.provinsi,
            kota_id: alamat.kota_id,
            kode_pos: alamat.kode_pos,
            isUtama: alamat.isUtama,
        });
        setIsFormDialogOpen(true);
    };

    const handleLocationSelect = async (result: ReverseGeocodeResult) => {
        setForm((prev) => ({
            ...prev,
            alamat_lengkap: result.alamat_lengkap,
            kota: result.kota,
            kecamatan: result.kecamatan,
            provinsi: result.provinsi,
            kode_pos: result.kode_pos,
            kota_id: null,
        }));

        try {
            const query = [result.kecamatan, result.kota].filter(Boolean).join(", ");
            const matches = await searchOngkirDestination(query || result.kota);

            if (matches.length > 0) {
                setForm((prev) => ({ ...prev, kota_id: matches[0].id }));
                toast.success("Alamat & kecamatan terisi otomatis dari peta");
            } else {
                toast.error("Kota/kecamatan tidak ditemukan otomatis, cari manual di bawah");
            }
        } catch {
            toast.error("Gagal mencocokkan kota/kecamatan, cari manual di bawah");
        }
    };

    const handleSearchDestination = async (field: "kota" | "kecamatan", query: string) => {
        if (query.length < 3) {
            setDestinationOptions((prev) => ({ ...prev, [field]: [] }));
            return;
        }

        setSearchingDestination((prev) => ({ ...prev, [field]: true }));
        try {
            const results = await searchOngkirDestination(query);
            setDestinationOptions((prev) => ({ ...prev, [field]: results }));
        } catch {
            setDestinationOptions((prev) => ({ ...prev, [field]: [] }));
        } finally {
            setSearchingDestination((prev) => ({ ...prev, [field]: false }));
        }
    };

    const handleSelectDestination = (field: "kota" | "kecamatan", dest: OngkirDestination) => {
        const [kecamatanLabel, kotaLabel] = dest.label.split(",").map((s) => s.trim());

        setForm((prev) => ({
            ...prev,
            kota_id: dest.id,
            kota: kotaLabel || prev.kota,
            kecamatan: kecamatanLabel || prev.kecamatan,
            provinsi: dest.provinsi || prev.provinsi,
        }));
        setDestinationOptions((prev) => ({ ...prev, [field]: [] }));
    };

    const handleSimpanAlamat = async () => {
        if (
            !form.nama_penerima ||
            !form.nomor_telepon ||
            !form.alamat_lengkap ||
            !form.kota ||
            !form.kecamatan ||
            !form.provinsi ||
            !form.kode_pos
        ) {
            toast.error("Lengkapi semua field terlebih dahulu");
            return;
        }
        if (!form.kota_id) {
            toast.error("Pilih kota/kecamatan dari hasil pencarian terlebih dahulu");
            return;
        }

        setSaving(true);
        tampilkanLoading(editingId ? "Memperbarui alamat..." : "Menambahkan alamat...");
        try {
            if (editingId) {
                await updateAlamat(editingId, form);
                const fresh = await getAlamatList();
                setAlamatList(fresh);
                const updated = fresh.find((a) => a.alamat_id === editingId) ?? null;
                if (selectedAlamat?.alamat_id === editingId && updated) {
                    setSelectedAlamat(updated);
                }
                Swal.close();
                toast.success("Alamat berhasil diperbarui");
            } else {
                const created = await createAlamat(form);
                const fresh = await getAlamatList();
                setAlamatList(fresh);
                const pilih =
                    fresh.find((a) => a.alamat_id === created?.alamat_id) ??
                    fresh[fresh.length - 1] ??
                    null;
                setSelectedAlamat(pilih);
                Swal.close();
                toast.success("Alamat berhasil ditambahkan");
            }
            setIsFormDialogOpen(false);
        } catch (err) {
            Swal.close();
            const message = err instanceof Error ? err.message : "Gagal menyimpan alamat";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleHapusAlamat = async (id: string, nama: string) => {
        const konfirmasi = await confirmHapus(nama);
        if (!konfirmasi) return;

        tampilkanLoading("Menghapus alamat...");
        try {
            await deleteAlamat(id);
            const fresh = await getAlamatList();
            setAlamatList(fresh);

            if (selectedAlamat?.alamat_id === id) {
                const pengganti = fresh.find((a) => a.isUtama) ?? fresh[0] ?? null;
                setSelectedAlamat(pengganti);
            }

            Swal.close();
            toast.success("Alamat berhasil dihapus");
        } catch {
            Swal.close();
            toast.error("Gagal menghapus alamat");
        }
    };

    const openJasaDialog = async () => {
        if (!selectedAlamat) {
            toast.error("Pilih alamat pengiriman terlebih dahulu");
            return;
        }
        if (!selectedAlamat.kota_id) {
            toast.error("Alamat ini belum punya data kota RajaOngkir. Edit ulang alamat terlebih dahulu.");
            return;
        }

        const originId = produk[0]?.tokoKotaId ?? null;
        const jurusanId = produk[0]?.jurusanId ?? null;

        if (!originId) {
            toast.error("Toko ini belum punya data kota asal RajaOngkir");
            return;
        }
        if (!jurusanId) {
            toast.error("Data jurusan produk tidak ditemukan");
            return;
        }

        setIsJasaDialogOpen(true);
        setLoadingJasa(true);
        setJasaList([]);

        try {
            const totalBerat = produk.reduce((sum, p) => sum + 1000 * p.kuantitas, 0);
            const rates = await getOngkosKirim(originId, selectedAlamat.kota_id, totalBerat, jurusanId);

            setJasaList(
                rates.map((r) => ({
                    id: `${r.code}-${r.service}`,
                    kurir: r.name,
                    layanan: r.service,
                    estimasi: r.etd || "-",
                    harga: r.cost,
                }))
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Gagal memuat jasa pengiriman");
        } finally {
            setLoadingJasa(false);
        }
    };

    const handlePilihJasa = (jasa: JasaPengiriman) => {
        setSelectedJasa(jasa);
        setIsJasaDialogOpen(false);
    };

    // Bagi 1 ongkir yang dipilih secara proporsional ke tiap toko berdasarkan subtotal produknya
    const bagiOngkirPerToko = () => {
        if (!selectedJasa || groupedByToko.length === 0) return new Map<string, number>();

        const hasil = new Map<string, number>();
        let sisaOngkir = selectedJasa.harga;

        groupedByToko.forEach((g, idx) => {
            const isTerakhir = idx === groupedByToko.length - 1;
            if (isTerakhir) {
                hasil.set(g.tokoId, sisaOngkir);
            } else {
                const porsi = Math.round(selectedJasa.harga * (g.subtotal / subTotal));
                hasil.set(g.tokoId, porsi);
                sisaOngkir -= porsi;
            }
        });

        return hasil;
    };

    // Dipakai baik saat pertama kali "Buat Pesanan" maupun saat user klik
    // "Lanjutkan Pembayaran" dari dialog konfirmasi — snapToken yang sama
    // masih valid untuk dibuka ulang selama belum expired (default 24 jam).
    const bukaSnapPay = (snapToken: string, kodeInvoice: string) => {
        if (!window.snap) {
            toast.error("Metode pembayaran belum siap, coba lagi sesaat lagi");
            return;
        }

        window.snap.pay(snapToken, {
            onSuccess: () => {
                toast.success("Pembayaran berhasil");
                window.location.href = `/profile/pesanan?invoice=${kodeInvoice}`;
            },
            onPending: () => {
                toast.info("Menunggu pembayaran kamu diselesaikan");
                window.location.href = `/profile/pesanan?invoice=${kodeInvoice}`;
            },
            onError: () => {
                toast.error("Pembayaran gagal, silakan coba lagi");
            },
            onClose: () => {
                setPesananBelumBayar({ kodeInvoice, snapToken });
            },
        });
    };

    // ==== Buat Pesanan lalu langsung buka Snap ====
    // Status "Lunas" BARU diupdate lewat webhook /api/midtrans/notification setelah
    // pembayaran benar-benar settlement — bukan langsung diasumsikan sukses di sini.
    const handleBuatPesanan = async () => {
        if (!selectedAlamat) {
            toast.error("Pilih alamat pengiriman terlebih dahulu");
            return;
        }
        if (!selectedJasa) {
            toast.error("Pilih jasa pengiriman terlebih dahulu");
            return;
        }
        if (!snapReady || !window.snap) {
            toast.error("Metode pembayaran belum siap, coba lagi sesaat lagi");
            return;
        }

        setCreating(true);
        tampilkanLoading("Membuat pesanan...");
        try {
            const ongkirPerToko = bagiOngkirPerToko();

            const result = await buatPesanan({
                alamatId: selectedAlamat.alamat_id,
                toko: groupedByToko.map((g) => ({
                    jurusanId: g.jurusanId,
                    produk: g.items.map((p) => ({
                        produkId: p.produkId,
                        jumlah: p.kuantitas,
                        hargaSatuan: p.harga,
                        keranjangDetailId: p.id,
                    })),
                    jasa: {
                        kurir: selectedJasa.kurir,
                        layanan: selectedJasa.layanan,
                        ongkir: ongkirPerToko.get(g.tokoId) ?? 0,
                        estimasi: selectedJasa.estimasi,
                    },
                })),
            });

            Swal.close();
            bukaSnapPay(result.snapToken, result.kodeInvoice);
        } catch (err) {
            Swal.close();
            toast.error(err instanceof Error ? err.message : "Gagal membuat pesanan");
        } finally {
            setCreating(false);
        }
    };

    const handleLanjutkanBayar = () => {
        if (!pesananBelumBayar || !snapReady || !window.snap) return;
        const { snapToken, kodeInvoice } = pesananBelumBayar;
        setPesananBelumBayar(null);
        bukaSnapPay(snapToken, kodeInvoice);
    };

    const handleBatalkanPesanan = async () => {
        if (!pesananBelumBayar) return;
        setIsCancelling(true);
        tampilkanLoading("Membatalkan pesanan...");
        try {
            await batalkanPesananCheckout(pesananBelumBayar.kodeInvoice);
            Swal.close();
            toast.success("Pesanan dibatalkan");
            window.location.href = "/keranjang";
        } catch (err) {
            Swal.close();
            toast.error(err instanceof Error ? err.message : "Gagal membatalkan pesanan");
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="min-h-screen py-6 px-4 md:px-8">
            <div className="max-w-4xl mx-auto space-y-4">
                {/* Alamat Pengirim */}
                <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-4 h-4 text-gray-800" />
                        <h2 className="text-base font-bold text-gray-900">Alamat Pengirim</h2>
                    </div>

                    {selectedAlamat ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-8">
                                <span className="text-sm font-bold text-gray-900 w-20 shrink-0">
                                    {selectedAlamat.nama_penerima}
                                </span>
                                <span className="text-sm text-gray-700">
                                    {selectedAlamat.alamat_lengkap}, {selectedAlamat.kecamatan}, {selectedAlamat.kota}, {selectedAlamat.provinsi} {selectedAlamat.kode_pos}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsPilihDialogOpen(true)}
                                className="text-sm font-semibold text-sky-400 hover:text-sky-500 transition-colors shrink-0"
                            >
                                Pilih Alamat
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Belum ada alamat dipilih</span>
                            <button
                                onClick={() => setIsPilihDialogOpen(true)}
                                className="text-sm font-semibold text-sky-400 hover:text-sky-500 transition-colors"
                            >
                                Pilih Alamat
                            </button>
                        </div>
                    )}
                </div>

                {/* Produk Dipesan */}
                <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                    <h2 className="text-base font-bold text-gray-900 mb-4">Produk Dipesan</h2>

                    <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-4 pb-3">
                        <span className="text-sm font-bold text-gray-900">Produk</span>
                        <span className="text-sm font-bold text-gray-900 text-center">Harga Satuan</span>
                        <span className="text-sm font-bold text-gray-900 text-center">Jumlah</span>
                        <span className="text-sm font-bold text-gray-900 text-center">Subtotal Produk</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {produk.map((item) => (
                            <div
                                key={item.id}
                                className="grid grid-cols-[2.2fr_1fr_1fr_1fr] items-center gap-4 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
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
                                        <p className="text-xs text-gray-500 mt-0.5">{item.toko}</p>
                                    </div>
                                </div>

                                <span className="text-sm text-gray-700 text-center">
                                    {formatRupiah(item.harga)}
                                </span>
                                <span className="text-sm text-gray-700 text-center">{item.kuantitas}</span>
                                <span className="text-sm font-medium text-gray-800 text-center">
                                    {formatRupiah(item.harga * item.kuantitas)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Jasa Pengiriman */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-900">Jasa Pengiriman</span>
                                {selectedJasa && (
                                    <span className="text-xs font-semibold text-gray-700 border border-gray-300 rounded-md px-3 py-1">
                                        {selectedJasa.kurir} - {selectedJasa.layanan}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={openJasaDialog}
                                className="text-sm font-semibold text-sky-400 hover:text-sky-500 transition-colors"
                            >
                                {selectedJasa ? "Ganti Jasa Pengiriman" : "Pilih Jasa Pengiriman"}
                            </button>
                        </div>

                        {selectedJasa ? (
                            <div className="border-t border-gray-100 pt-3 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 leading-snug">
                                        {selectedJasa.kurir}
                                    </p>
                                    <p className="text-sm text-gray-700 mt-0.5">
                                        {selectedJasa.layanan} &middot; Estimasi {selectedJasa.estimasi}
                                    </p>
                                </div>
                                <span className="text-sm font-medium text-gray-800 shrink-0 whitespace-nowrap">
                                    {formatRupiah(selectedJasa.harga)}
                                </span>
                            </div>
                        ) : (
                            <div className="border-t border-gray-100 pt-3">
                                <span className="text-sm text-gray-500">Belum ada jasa pengiriman dipilih</span>
                            </div>
                        )}
                    </div>

                    {/* Ringkasan & Checkout */}
                    <div className="mt-8 flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Sub Total</span>
                                <span className="text-gray-800">{formatRupiah(subTotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Biaya Ongkir</span>
                                <span className="text-gray-800">
                                    {selectedJasa ? formatRupiah(biayaOngkir) : "-"}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-gray-900">Total</span>
                                <span className="text-gray-900">{formatRupiah(total)}</span>
                            </div>

                            <Button
                                onClick={handleBuatPesanan}
                                disabled={produk.length === 0 || creating}
                                className="w-full rounded-full bg-sky-400 hover:bg-sky-500 text-white font-semibold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {creating ? "Memproses..." : "Buat Pesanan"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialog Pilih Alamat */}
            <Dialog open={isPilihDialogOpen} onOpenChange={setIsPilihDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Pilih Alamat Pengiriman</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
                        {alamatList.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">
                                Belum ada alamat tersimpan
                            </p>
                        ) : (
                            alamatList.map((alamat) => {
                                const isSelected = selectedAlamat?.alamat_id === alamat.alamat_id;
                                return (
                                    <div
                                        key={alamat.alamat_id}
                                        className={`w-full border rounded-xl p-4 transition-colors ${isSelected
                                            ? "border-sky-400 bg-sky-50"
                                            : "border-gray-200 hover:border-sky-300"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handlePilihAlamat(alamat)}
                                                className="flex-1 text-left"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-900 text-sm">
                                                        {alamat.nama_penerima}
                                                    </p>
                                                    {alamat.isUtama && (
                                                        <span className="text-[10px] font-bold text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
                                                            Utama
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {alamat.nomor_telepon}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                                    {alamat.alamat_lengkap}, {alamat.kecamatan}, {alamat.kota}, {alamat.provinsi} {alamat.kode_pos}
                                                </p>
                                            </button>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditAlamatForm(alamat)}
                                                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-sky-600 bg-sky-50 hover:bg-sky-200 hover:text-sky-700 transition-colors"
                                                    aria-label="Edit alamat"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleHapusAlamat(alamat.alamat_id, alamat.nama_penerima)}
                                                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-200 hover:text-red-700 transition-colors"
                                                    aria-label="Hapus alamat"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-sky-500 mt-0.5" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <DialogFooter className="sm:justify-start">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={openTambahAlamatForm}
                            className="rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Alamat Baru
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Tambah/Edit Alamat */}
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-gray-100">
                        <DialogTitle>{editingId ? "Edit Alamat" : "Tambah Alamat Baru"}</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <AddressMapPicker onLocationSelect={handleLocationSelect} />

                        <div className="space-y-1.5">
                            <Label htmlFor="nama_penerima" className="text-sm text-gray-700">
                                Nama Penerima
                            </Label>
                            <Input
                                id="nama_penerima"
                                value={form.nama_penerima}
                                onChange={(e) => setForm({ ...form, nama_penerima: e.target.value })}
                                className="rounded-lg border-gray-200 h-10"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="nomor_telepon" className="text-sm text-gray-700">
                                Nomor Telepon
                            </Label>
                            <Input
                                id="nomor_telepon"
                                type="tel"
                                value={form.nomor_telepon}
                                onChange={(e) => setForm({ ...form, nomor_telepon: e.target.value })}
                                className="rounded-lg border-gray-200 h-10"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="alamat_lengkap" className="text-sm text-gray-700">
                                Alamat Lengkap
                            </Label>
                            <Input
                                id="alamat_lengkap"
                                value={form.alamat_lengkap}
                                onChange={(e) => setForm({ ...form, alamat_lengkap: e.target.value })}
                                className="rounded-lg border-gray-200 h-10"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 relative">
                                <Label htmlFor="kota" className="text-sm text-gray-700">
                                    Kota{" "}
                                    {form.kota_id && (
                                        <span className="text-xs text-green-600 font-normal">✓ Terhubung</span>
                                    )}
                                </Label>
                                <Input
                                    id="kota"
                                    placeholder="Ketik nama kota..."
                                    value={form.kota}
                                    autoComplete="off"
                                    onChange={(e) => {
                                        setForm((prev) => ({ ...prev, kota: e.target.value, kota_id: null }));
                                        handleSearchDestination("kota", e.target.value);
                                    }}
                                    className="rounded-lg border-gray-200 h-10"
                                />
                                {searchingDestination.kota && <p className="text-xs text-gray-400">Mencari...</p>}
                                {destinationOptions.kota.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto shadow-sm">
                                        {destinationOptions.kota.map((dest) => (
                                            <button
                                                key={dest.id}
                                                type="button"
                                                onClick={() => handleSelectDestination("kota", dest)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50 transition-colors"
                                            >
                                                {dest.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5 relative">
                                <Label htmlFor="kecamatan" className="text-sm text-gray-700">
                                    Kecamatan{" "}
                                    {form.kota_id && (
                                        <span className="text-xs text-green-600 font-normal">✓ Terhubung</span>
                                    )}
                                </Label>
                                <Input
                                    id="kecamatan"
                                    placeholder="Ketik nama kecamatan..."
                                    value={form.kecamatan}
                                    autoComplete="off"
                                    onChange={(e) => {
                                        setForm((prev) => ({ ...prev, kecamatan: e.target.value, kota_id: null }));
                                        handleSearchDestination("kecamatan", e.target.value);
                                    }}
                                    className="rounded-lg border-gray-200 h-10"
                                />
                                {searchingDestination.kecamatan && <p className="text-xs text-gray-400">Mencari...</p>}
                                {destinationOptions.kecamatan.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto shadow-sm">
                                        {destinationOptions.kecamatan.map((dest) => (
                                            <button
                                                key={dest.id}
                                                type="button"
                                                onClick={() => handleSelectDestination("kecamatan", dest)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50 transition-colors"
                                            >
                                                {dest.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5 relative">
                                <Label htmlFor="provinsi" className="text-sm text-gray-700">
                                    Provinsi
                                </Label>
                                <Input
                                    id="provinsi"
                                    value={form.provinsi}
                                    onChange={(e) => setForm({ ...form, provinsi: e.target.value })}
                                    className="rounded-lg border-gray-200 h-10"
                                    placeholder="Terisi otomatis dari peta/pencarian"
                                />
                            </div>
                            <div className="space-y-1.5 relative">
                                <Label htmlFor="kode_pos" className="text-sm text-gray-700">
                                    Kode Pos
                                </Label>
                                <Input
                                    id="kode_pos"
                                    value={form.kode_pos}
                                    onChange={(e) => setForm({ ...form, kode_pos: e.target.value })}
                                    className="rounded-lg border-gray-200 h-10"
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-600 pt-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isUtama}
                                onChange={(e) => setForm({ ...form, isUtama: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
                            />
                            Jadikan alamat utama
                        </label>
                    </div>

                    <DialogFooter className="px-6 py-4 shrink-0 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsFormDialogOpen(false)}
                            className="rounded-lg"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSimpanAlamat}
                            disabled={saving}
                            className="rounded-lg bg-sky-400 hover:bg-sky-500 text-white font-semibold"
                        >
                            {saving ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Pilih Jasa Pengiriman */}
            <Dialog open={isJasaDialogOpen} onOpenChange={setIsJasaDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Pilih Jasa Pengiriman</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
                        {loadingJasa ? (
                            <div className="space-y-3">
                                <Skeleton className="h-16 w-full rounded-xl" />
                                <Skeleton className="h-16 w-full rounded-xl" />
                                <Skeleton className="h-16 w-full rounded-xl" />
                            </div>
                        ) : jasaList.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">
                                Tidak ada jasa pengiriman tersedia
                            </p>
                        ) : (
                            jasaList.map((jasa) => {
                                const isSelected = selectedJasa?.id === jasa.id;
                                return (
                                    <button
                                        key={jasa.id}
                                        type="button"
                                        onClick={() => handlePilihJasa(jasa)}
                                        className={`w-full text-left border rounded-xl p-4 transition-colors ${isSelected
                                            ? "border-sky-400 bg-sky-50"
                                            : "border-gray-200 hover:border-sky-300"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <Truck className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-900 text-sm leading-snug">
                                                        {jasa.kurir}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {jasa.layanan} &middot; Estimasi {jasa.estimasi}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                                                    {formatRupiah(jasa.harga)}
                                                </span>
                                                {isSelected && <Check className="w-4 h-4 text-sky-500" />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog konfirmasi kalau popup Snap ditutup tanpa pembayaran selesai */}
            <Dialog
                open={!!pesananBelumBayar}
                onOpenChange={(open) => {
                    // Ditutup lewat X/ESC/klik luar -> anggap "nanti saja", pesanan
                    // tetap tersimpan dan bisa dilanjutkan dari halaman Pesanan Saya
                    if (!open && pesananBelumBayar) {
                        const invoice = pesananBelumBayar.kodeInvoice;
                        setPesananBelumBayar(null);
                        toast.info("Pesanan tersimpan, kamu bisa lanjutkan pembayaran dari halaman Pesanan Saya");
                        window.location.href = `/profile/pesanan?invoice=${invoice}`;
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pembayaran Belum Selesai</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">
                        Pesanan kamu sudah dibuat (Order #{pesananBelumBayar?.kodeInvoice}) tapi
                        pembayaran belum diselesaikan. Mau lanjutkan pembayaran sekarang, atau
                        batalkan pesanan ini?
                    </p>
                    <DialogFooter className="sm:justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBatalkanPesanan}
                            disabled={isCancelling}
                            className="rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                        >
                            {isCancelling ? "Membatalkan..." : "Batalkan Pesanan"}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleLanjutkanBayar}
                            disabled={isCancelling}
                            className="rounded-lg bg-sky-400 hover:bg-sky-500 text-white font-semibold"
                        >
                            Lanjutkan Pembayaran
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}