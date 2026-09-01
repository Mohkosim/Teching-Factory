"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import { Search, ChevronDown, Star, Wallet, PackageCheck, Camera, Check, Undo2, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { tambahPembayaran, simpanRating } from "@/lib/api/pesanan-api";
import { konfirmasiPesananDiterimaAction } from "@/lib/getdata/get-pesanan";
import { useMidtransSnap } from "@/lib/hooks/useMidtransSnap";
import type { ProdukItem, JasaItem, FotoUlasan, StatusRefund } from "@/types/interfaces/pesanan";
import { ajukanRefund } from "@/lib/api/refund";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

function waLinkPesanan(item: JasaItem) {
    if (!item.noWhatsapp) return undefined;
    const bersih = item.noWhatsapp.replace(/[^0-9]/g, "");
    const target = bersih.startsWith("0") ? `62${bersih.slice(1)}` : bersih;
    const pesan = encodeURIComponent(`Halo, saya ingin menanyakan progres pesanan jasa "${item.nama}".`);
    return `https://wa.me/${target}?text=${pesan}`;
}

function formatRupiah(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

interface RatingQueueItem {
    itemStateId: string;
    produkId: string;
    nama: string;
    thumbnail?: string;
    initialRating?: number;
    initialUlasan?: string;
    initialFotoUlasan?: FotoUlasan[];
}
interface RatingQueueState {
    kind: "produk" | "jasa";
    items: RatingQueueItem[];
}

const MAX_FOTO_ULASAN = 5;
const MAX_FOTO_SIZE = 5 * 1024 * 1024;

function groupProdukByInvoice(items: ProdukItem[]) {
    const map = new Map<string, ProdukItem[]>();
    for (const item of items) {
        const list = map.get(item.kodeInvoice) ?? [];
        list.push(item);
        map.set(item.kodeInvoice, list);
    }
    return Array.from(map.values());
}

function groupByOrderId(items: ProdukItem[]) {
    const map = new Map<string, ProdukItem[]>();
    for (const item of items) {
        const list = map.get(item.orderId) ?? [];
        list.push(item);
        map.set(item.orderId, list);
    }
    return Array.from(map.values());
}

export default function PesananClient({
    initialProduk,
    initialJasa,
    initialNama,
    initialAvatar,
}: {
    initialProduk: ProdukItem[];
    initialJasa: JasaItem[];
    initialNama: string;
    initialAvatar: string | null;
}) {
    const router = useRouter();
    const snapReady = useMidtransSnap();
    const [isConfirmPending, startConfirmTransition] = useTransition();

    const [nama] = useState(initialNama);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatar);

    const [produkData, setProdukData] = useState<ProdukItem[]>(initialProduk);
    const [prevInitialProduk, setPrevInitialProduk] = useState(initialProduk);
    if (initialProduk !== prevInitialProduk) {
        setPrevInitialProduk(initialProduk);
        setProdukData(initialProduk);
    }
    const [jasaData, setJasaData] = useState<JasaItem[]>(initialJasa);
    const [prevInitialJasa, setPrevInitialJasa] = useState(initialJasa);
    if (initialJasa !== prevInitialJasa) {
        setPrevInitialJasa(initialJasa);
        setJasaData(initialJasa);
    }

    const [activeTab, setActiveTab] = useState<"produk" | "jasa">("produk");
    const [search, setSearch] = useState("");

    const [selectedOrder, setSelectedOrder] = useState<ProdukItem[] | null>(null);
    const [selectedJasaDetail, setSelectedJasaDetail] = useState<JasaItem | null>(null);
    const [ratingQueue, setRatingQueue] = useState<RatingQueueState | null>(null);
    const [pembayaranTarget, setPembayaranTarget] = useState<JasaItem | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSaveRating = async (
        ratings: { produkId: string; itemStateId: string; rating: number; komentar: string }[],
        fotoBaru: File[],
        keepFotoIds: string[]
    ) => {
        if (!ratingQueue) return;
        tampilkanLoading("Menyimpan rating...");
        try {
            const results = await Promise.all(
                ratings.map((r) => simpanRating(r.produkId, r.itemStateId, r.rating, r.komentar, fotoBaru, keepFotoIds))
            );
            const fotoUlasanPerProduk = new Map<string, FotoUlasan[]>();
            ratings.forEach((r, idx) => {
                fotoUlasanPerProduk.set(
                    r.produkId,
                    results[idx]?.foto?.map((f) => ({ id: f.foto_id, url: f.url })) ?? []
                );
            });

            if (ratingQueue.kind === "jasa") {
                setJasaData((prev) =>
                    prev.map((j) => {
                        const found = ratings.find((r) => r.itemStateId === j.id);
                        return found
                            ? { ...j, rating: found.rating, ulasan: found.komentar, fotoUlasan: fotoUlasanPerProduk.get(found.produkId) ?? j.fotoUlasan }
                            : j;
                    })
                );
            } else {
                setProdukData((prev) =>
                    prev.map((p) => {
                        const found = ratings.find((r) => r.itemStateId === p.id);
                        return found
                            ? { ...p, rating: found.rating, ulasan: found.komentar, fotoUlasan: fotoUlasanPerProduk.get(found.produkId) ?? p.fotoUlasan }
                            : p;
                    })
                );
            }
            Swal.close();
            toast.success("Rating berhasil disimpan");
        } catch {
            Swal.close();
            toast.error("Gagal menyimpan rating");
        } finally {
            setRatingQueue(null);
        }
    };

    const handleBeriNilaiProduk = (item: ProdukItem) => {
        setRatingQueue({
            kind: "produk",
            items: [{
                itemStateId: item.id,
                produkId: item.produkId,
                nama: item.nama,
                thumbnail: item.thumbnail,
                initialRating: item.rating,
                initialUlasan: item.ulasan,
                initialFotoUlasan: item.fotoUlasan,
            }],
        });
    };

    const handleBeriNilaiJasa = (item: JasaItem) => {
        setRatingQueue({
            kind: "jasa",
            items: [{
                itemStateId: item.id,
                produkId: item.produkId,
                nama: item.nama,
                thumbnail: item.thumbnail,
                initialRating: item.rating,
                initialUlasan: item.ulasan,
                initialFotoUlasan: item.fotoUlasan,
            }],
        });
    };

    const handleKonfirmasiDiterimaProduk = (items: ProdukItem[]) => {
        const orderId = items[0].orderId;
        setProdukData((prev) =>
            prev.map((p) => (p.orderId === orderId ? { ...p, timelineStep: 3, statusKirim: "Diterima" } : p))
        );
        setSelectedOrder((prev) =>
            prev ? prev.map((p) => (p.orderId === orderId ? { ...p, timelineStep: 3, statusKirim: "Diterima" } : p)) : prev
        );
        startConfirmTransition(async () => {
            tampilkanLoading("Mengonfirmasi pesanan diterima...");
            try {
                await konfirmasiPesananDiterimaAction(orderId);
                router.refresh();
                Swal.close();
                toast.success("Pesanan ditandai diterima");
                setSelectedOrder(null);
                setRatingQueue({
                    kind: "produk",
                    items: items.map((i) => ({
                        itemStateId: i.id,
                        produkId: i.produkId,
                        nama: i.nama,
                        thumbnail: i.thumbnail,
                        initialRating: i.rating,
                        initialUlasan: i.ulasan,
                        initialFotoUlasan: i.fotoUlasan,
                    })),
                });
            } catch {
                Swal.close();
                toast.error("Gagal mengonfirmasi pesanan diterima");
            }
        });
    };

    const handleKonfirmasiSelesaiJasa = (item: JasaItem) => {
        setJasaData((prev) => prev.map((j) => (j.id === item.id ? { ...j, timelineStep: 3 } : j)));
        setSelectedJasaDetail((prev) => (prev && prev.id === item.id ? { ...prev, timelineStep: 3 } : prev));
        startConfirmTransition(async () => {
            tampilkanLoading("Mengonfirmasi pesanan selesai...");
            try {
                await konfirmasiPesananDiterimaAction(item.orderId);
                router.refresh();
                Swal.close();
                toast.success("Pesanan jasa ditandai selesai");
                setSelectedJasaDetail(null);
                setRatingQueue({
                    kind: "jasa",
                    items: [{
                        itemStateId: item.id,
                        produkId: item.produkId,
                        nama: item.nama,
                        thumbnail: item.thumbnail,
                        initialRating: item.rating,
                        initialUlasan: item.ulasan,
                        initialFotoUlasan: item.fotoUlasan,
                    }],
                });
            } catch {
                Swal.close();
                toast.error("Gagal mengonfirmasi pesanan selesai");
            }
        });
    };

    const handleTambahPembayaran = async (data: { nominal: number }) => {
        if (!pembayaranTarget) return;
        if (!snapReady || !window.snap) {
            toast.error("Metode pembayaran belum siap, coba lagi sesaat lagi");
            return;
        }
        tampilkanLoading("Menyiapkan pembayaran...");
        try {
            const { snapToken } = await tambahPembayaran(pembayaranTarget.orderId, { nominal: data.nominal });
            Swal.close();
            window.snap.pay(snapToken, {
                onSuccess: () => {
                    toast.success("Pembayaran berhasil");
                    router.refresh();
                },
                onPending: () => {
                    toast.info("Menunggu pembayaran kamu diselesaikan");
                    router.refresh();
                },
                onError: () => {
                    toast.error("Pembayaran gagal, silakan coba lagi");
                },
                onClose: () => {
                    router.refresh();
                },
            });
        } catch (err) {
            Swal.close();
            toast.error(err instanceof Error ? err.message : "Gagal memproses pembayaran");
        } finally {
            setPembayaranTarget(null);
        }
    };

    const handleBeliLagi = (item: ProdukItem) => router.push(`/produk/detail?id=${item.produkId}`);

    const searchLower = search.trim().toLowerCase();
    const filteredProduk = searchLower
        ? produkData.filter((p) => p.nama.toLowerCase().includes(searchLower))
        : produkData;
    const orderGroups = groupProdukByInvoice(filteredProduk);

    const filteredJasa = searchLower
        ? jasaData.filter((j) => j.nama.toLowerCase().includes(searchLower))
        : jasaData;

    const [refundTarget, setRefundTarget] = useState<{ orderId: string; nama: string } | null>(null);

    const handleSubmitRefund = async (formData: FormData) => {
        tampilkanLoading("Mengirim pengajuan refund...");
        try {
            await ajukanRefund(formData);
            Swal.close();
            toast.success("Pengajuan refund berhasil dikirim, tunggu tindak lanjut dari toko");
            setRefundTarget(null);
            router.refresh();
        } catch (err) {
            Swal.close();
            toast.error(err instanceof Error ? err.message : "Gagal mengajukan refund");
        }
    };

    return (
        <div className="min-h-screen py-6 px-4 md:px-8">
            <div className="max-w-6xl mx-auto flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Pesanan</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{activeTab === "produk" ? "Produk" : "Jasa"}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
                <ProfileSidebar avatarPreview={avatarPreview} nama={nama} loading={false} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                <section className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                    <h1 className="text-xl font-bold text-gray-900 mb-4">Pesanan Saya</h1>

                    <div className="flex items-center gap-6 border-b border-gray-200 mb-5">
                        <button
                            onClick={() => setActiveTab("produk")}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "produk" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                        >
                            Produk
                        </button>
                        <button
                            onClick={() => setActiveTab("jasa")}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "jasa" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                        >
                            Jasa
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </div>
                        <div className="hidden md:block w-px h-8 bg-gray-200" />
                        <button className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="flex flex-col items-start leading-tight">
                                <span className="text-xs text-gray-400">Filter</span>
                                <span className="font-medium text-gray-700">Semua</span>
                            </span>
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>

                    {activeTab === "produk" ? (
                        orderGroups.length === 0 ? (
                            <EmptyState text="Belum ada pesanan produk" />
                        ) : (
                            <div>
                                {orderGroups.map((items) => (
                                    <OrderCard
                                        key={items[0].kodeInvoice}
                                        items={items}
                                        onLihatDetailToko={(tokoItems) => setSelectedOrder(tokoItems)}
                                        onBeliLagi={handleBeliLagi}
                                        onBeriNilai={handleBeriNilaiProduk}
                                        onKonfirmasiDiterima={handleKonfirmasiDiterimaProduk}
                                        onAjukanRefund={(orderId, nama) => setRefundTarget({ orderId, nama })}
                                        isConfirmPending={isConfirmPending}
                                    />
                                ))}
                            </div>
                        )
                    ) : (
                        <JasaList
                            items={filteredJasa}
                            onLihatDetail={(item) => setSelectedJasaDetail(item)}
                            onBeriNilai={handleBeriNilaiJasa}
                            onTambahPembayaran={(item) => setPembayaranTarget(item)}
                            onKonfirmasiSelesai={handleKonfirmasiSelesaiJasa}
                            isConfirmPending={isConfirmPending}
                        />
                    )}
                </section>
            </div>

            {selectedOrder && (
                <DetailOrderModal
                    items={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onKonfirmasiDiterima={handleKonfirmasiDiterimaProduk}
                    isConfirmPending={isConfirmPending}
                />
            )}

            {selectedJasaDetail && (
                <DetailJasaModal
                    item={selectedJasaDetail}
                    onClose={() => setSelectedJasaDetail(null)}
                    onTambahPembayaran={(item) => { setSelectedJasaDetail(null); setPembayaranTarget(item); }}
                    onKonfirmasiSelesai={handleKonfirmasiSelesaiJasa}
                    isConfirmPending={isConfirmPending}
                />
            )}

            {ratingQueue && (
                <RatingModal
                    items={ratingQueue.items}
                    onClose={() => setRatingQueue(null)}
                    onSave={handleSaveRating}
                />
            )}

            {pembayaranTarget && (
                <FormPembayaranModal
                    item={pembayaranTarget}
                    onClose={() => setPembayaranTarget(null)}
                    onSave={handleTambahPembayaran}
                />
            )}

            {refundTarget && (
                <RefundModal
                    orderId={refundTarget.orderId}
                    namaPesanan={refundTarget.nama}
                    onClose={() => setRefundTarget(null)}
                    onSubmit={handleSubmitRefund}
                />
            )}
        </div>
    );
}

function OrderCard({
    items, onLihatDetailToko, onBeliLagi, onBeriNilai, onKonfirmasiDiterima, onAjukanRefund, isConfirmPending,
}: {
    items: ProdukItem[];
    onLihatDetailToko: (items: ProdukItem[]) => void;
    onBeliLagi: (item: ProdukItem) => void;
    onBeriNilai: (item: ProdukItem) => void;
    onKonfirmasiDiterima: (items: ProdukItem[]) => void;
    onAjukanRefund: (orderId: string, nama: string) => void;
    isConfirmPending: boolean;
}) {
    const first = items[0];
    const subtotal = items.reduce((sum, i) => sum + i.hargaAngka * i.jumlah, 0);

    const ongkirPerOrder = new Map<string, number>();
    items.forEach((i) => ongkirPerOrder.set(i.orderId, i.biayaOngkir));
    const totalOngkir = Array.from(ongkirPerOrder.values()).reduce((a, b) => a + b, 0);
    const total = subtotal + totalOngkir;

    const semuaDibayar = items.every((i) => i.statusBayar === "Dibayar");

    const perToko = groupByOrderId(items);

    return (
        <div className="border border-gray-100 rounded-xl mb-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-xs text-gray-500">
                    {first.tanggal} · Order #{first.kodeInvoice.slice(0, 8)}
                </span>
            </div>

            <div className="divide-y divide-gray-100">
                {perToko.map((tokoItems) => (
                    <TokoSection
                        key={tokoItems[0].orderId}
                        items={tokoItems}
                        onLihatDetail={() => onLihatDetailToko(tokoItems)}
                        onBeliLagi={onBeliLagi}
                        onBeriNilai={onBeriNilai}
                        onKonfirmasiDiterima={onKonfirmasiDiterima}
                        onAjukanRefund={onAjukanRefund}
                        isConfirmPending={isConfirmPending}
                    />
                ))}
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                <span
                    className={`text-xs px-2.5 py-1 rounded-md font-medium ${semuaDibayar ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}
                >
                    {semuaDibayar ? "Dibayar" : "Belum Dibayar"}
                </span>
                <span className="text-sm text-gray-600">
                    Total <span className="font-bold text-gray-900">{formatRupiah(total)}</span>
                </span>
            </div>
        </div>
    );
}

function TokoSection({
    items, onLihatDetail, onBeliLagi, onBeriNilai, onKonfirmasiDiterima, onAjukanRefund, isConfirmPending,
}: {
    items: ProdukItem[];
    onLihatDetail: () => void;
    onBeliLagi: (item: ProdukItem) => void;
    onBeriNilai: (item: ProdukItem) => void;
    onKonfirmasiDiterima: (items: ProdukItem[]) => void;
    onAjukanRefund: (orderId: string, nama: string) => void;
    isConfirmPending: boolean;
}) {
    const first = items[0];
    const namaToko = (first as ProdukItem & { toko?: string }).toko ?? "Toko";
    const sudahDiterima = first.timelineStep === 3;
    const sedangDikirim = first.timelineStep === 2;
    const sudahLunas = items.every((i) => i.statusBayar === "Dibayar");

    return (
        <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">{namaToko}</span>
                <span className="text-xs font-medium text-blue-600">{first.statusKirim}</span>
            </div>

            <div className="divide-y divide-gray-50">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2">
                        <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                            {item.thumbnail && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.thumbnail} alt={item.nama} className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.nama}</p>
                            <p className="text-xs text-gray-500">{item.jumlah}x {item.harga}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {sudahDiterima && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onBeriNilai(item)}
                                    className="rounded-full text-blue-500 border-blue-300 text-xs px-4"
                                >
                                    {item.rating ? "Ubah Nilai" : "Beri Nilai"}
                                </Button>
                            )}
                            {sudahDiterima && (
                                <Button
                                    size="sm" variant="outline" onClick={() => onBeliLagi(item)}
                                    className="rounded-full text-blue-500 border-blue-300 text-xs px-4"
                                >
                                    Beli Lagi
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-2 flex justify-end gap-2">
                {first.refund ? (
                    <RefundStatusBadge status={first.refund.status} />
                ) : (
                    sudahDiterima && sudahLunas && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAjukanRefund(first.orderId, first.nama)}
                            className="rounded-full text-red-500 border-red-300 text-xs px-4 gap-1.5"
                        >
                            <Undo2 className="w-3.5 h-3.5" /> Ajukan Refund
                        </Button>
                    )
                )}
                {sedangDikirim && (
                    <Button
                        size="sm"
                        onClick={() => onKonfirmasiDiterima(items)}
                        disabled={isConfirmPending}
                        className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-4 gap-1.5"
                    >
                        <PackageCheck className="w-3.5 h-3.5" /> Pesanan Diterima
                    </Button>
                )}
                <Button size="sm" onClick={onLihatDetail} className="rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-4">
                    Lihat Detail
                </Button>
            </div>
        </div>
    );
}

function JasaList({
    items, onLihatDetail, onBeriNilai, onTambahPembayaran, onKonfirmasiSelesai, isConfirmPending,
}: {
    items: JasaItem[];
    onLihatDetail: (item: JasaItem) => void;
    onBeriNilai: (item: JasaItem) => void;
    onTambahPembayaran: (item: JasaItem) => void;
    onKonfirmasiSelesai: (item: JasaItem) => void;
    isConfirmPending: boolean;
}) {
    if (items.length === 0) return <EmptyState text="Belum ada pesanan jasa" />;

    return (
        <div className="space-y-4">
            {items.map((item) => {
                const sedangDikerjakan = item.timelineStep === 2;
                return (
                    <div key={item.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-none">
                        <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                            {item.thumbnail && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.thumbnail} alt={item.nama} className="w-full h-full object-cover" />
                            )}
                        </div>

                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">{item.nama}</p>
                            <p className="text-xs text-gray-500 mb-2">Total {formatRupiah(item.total)}</p>
                            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${item.status === "lunas" ? "bg-green-500" : "bg-yellow-400"}`}
                                    style={{ width: `${item.progress}%` }}
                                />
                            </div>
                            <p className={`text-xs mt-1 ${item.status === "lunas" ? "text-green-600" : "text-gray-500"}`}>
                                {item.rating ? `Rating kamu: ${item.rating}/5` : item.keterangan}
                            </p>
                            {item.noWhatsapp && (
                                <a href={waLinkPesanan(item)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-block text-xs font-medium text-green-600 hover:underline"
                                >
                                    Hubungi via WhatsApp
                                </a>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {sedangDikerjakan && (
                                <Button
                                    size="sm"
                                    onClick={() => onKonfirmasiSelesai(item)}
                                    disabled={isConfirmPending}
                                    className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-4 gap-1.5"
                                >
                                    <PackageCheck className="w-3.5 h-3.5" /> Pesanan Selesai
                                </Button>
                            )}
                            {item.status === "berjalan" && (
                                <Button size="sm" onClick={() => onTambahPembayaran(item)} className="rounded-full bg-yellow-400 hover:bg-yellow-500 text-white text-xs px-4 gap-1.5">
                                    <Wallet className="w-3.5 h-3.5" /> Tambah Pembayaran
                                </Button>
                            )}
                            {item.timelineStep === 3 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onBeriNilai(item)}
                                    className="rounded-full text-blue-500 border-blue-300 text-xs px-4"
                                >
                                    {item.rating ? "Ubah Nilai" : "Beri Nilai"}
                                </Button>
                            )}
                            <Button size="sm" onClick={() => onLihatDetail(item)} className="rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-4">
                                Lihat Detail
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">{text}</div>;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[92vw] max-w-lg rounded-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 shrink-0 border-b border-gray-100">
                    <DialogTitle className="text-base font-bold text-gray-900">{title}</DialogTitle>
                </DialogHeader>
                <div className="px-6 py-5 overflow-y-auto overflow-x-hidden">{children}</div>
            </DialogContent>
        </Dialog>
    );
}

function OrderTimeline({ step, labels }: { step: 0 | 1 | 2 | 3; labels: [string, string, string, string] }) {
    return (
        <div className="w-full">
            <p className="text-sm font-bold text-gray-800 mb-4">Timeline Pesanan</p>
            <div className="flex items-center">
                {labels.map((label, idx) => {
                    const isDone = idx < step;
                    const isActive = idx === step;
                    const isLast = idx === labels.length - 1;

                    return (
                        <div key={label} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1.5 w-16">
                                <div
                                    className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-sky-900" : isActive ? "bg-sky-400" : "bg-gray-300"
                                        }`}
                                >
                                    {isDone && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span
                                    className={`text-[10px] text-center leading-tight ${isDone || isActive ? "text-gray-700 font-medium" : "text-gray-400"
                                        }`}
                                >
                                    {label}
                                </span>
                            </div>
                            {!isLast && (
                                <div
                                    className={`h-0.5 flex-1 -mt-5 ${idx < step ? "bg-sky-900" : "bg-gray-300"
                                        }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function statusLabel(step: 0 | 1 | 2 | 3, labels: string[]) {
    return `Status : ${labels[step]}`;
}

function DetailOrderModal({ items, onClose, onKonfirmasiDiterima, isConfirmPending }: {
    items: ProdukItem[];
    onClose: () => void;
    onKonfirmasiDiterima: (items: ProdukItem[]) => void;
    isConfirmPending: boolean;
}) {
    const timelineLabels: [string, string, string, string] = ["Belum Bayar", "Diproses", "Dikirim", "Diterima"];
    const first = items[0];
    const subtotal = items.reduce((sum, i) => sum + i.hargaAngka * i.jumlah, 0);
    const totalOngkir = first.biayaOngkir;
    const total = subtotal + totalOngkir;
    const sedangDikirim = first.timelineStep === 2;

    return (
        <ModalShell title="Detail Pesanan" onClose={onClose}>
            <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-gray-500">
                    <p>Tanggal : {first.tanggal}</p>
                    <p>Invoice : {first.kodeInvoice}</p>
                    {(first as ProdukItem & { toko?: string }).toko && (
                        <p>Toko : {(first as ProdukItem & { toko?: string }).toko}</p>
                    )}
                </div>
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                    {statusLabel(first.timelineStep, timelineLabels)}
                </span>
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mb-2">Produk</h3>
            <div className="bg-blue-50 rounded-2xl p-5 mb-4">
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gray-200 overflow-hidden shrink-0">
                                {item.thumbnail && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.thumbnail} alt={item.nama} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">{item.nama}</p>
                                <p className="text-xs text-gray-600 mt-0.5">Jumlah : {item.jumlah}</p>
                                <p className="text-xs text-gray-600">Harga : {item.harga}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="h-px bg-blue-100 my-4" />
                <OrderTimeline step={first.timelineStep} labels={timelineLabels} />
            </div>

            <div className="space-y-1.5 mb-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Sub Total</span>
                    <span className="text-gray-800 font-medium">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Biaya Ongkir</span>
                    <span className="text-gray-800 font-medium">{formatRupiah(totalOngkir)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <span className="text-gray-700 font-semibold">Total</span>
                    <span className="text-gray-900 font-bold">{formatRupiah(total)}</span>
                </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mb-2">Detail Pembeli</h3>
            <DetailRow label="Nama" value={first.pembeli.nama} />
            <DetailRow label="Nomor" value={first.pembeli.nomor} />
            <DetailRow label="E-mail" value={first.pembeli.email} />
            <DetailRow label="Alamat" value={first.pembeli.alamat} />

            <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-2">Detail Pengiriman</h3>
            <DetailRow label="Kurir" value={first.pengiriman.kurir} />
            <DetailRow label="Nomor Resi" value={first.pengiriman.nomorResi} />
            <DetailRow label="Estimasi" value={first.pengiriman.estimasi} />

            {sedangDikirim && (
                <>
                    <p className="text-xs text-gray-400 mt-4 mb-2">
                        Sudah menerima barangnya? Cek nomor resi di atas lewat website kurir untuk
                        memastikan, lalu konfirmasi di bawah ini.
                    </p>
                    <Button
                        onClick={() => onKonfirmasiDiterima(items)}
                        disabled={isConfirmPending}
                        className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
                    >
                        <PackageCheck className="w-4 h-4" /> Pesanan Diterima
                    </Button>
                </>
            )}
        </ModalShell>
    );
}

function DetailJasaModal({ item, onClose, onTambahPembayaran, onKonfirmasiSelesai, isConfirmPending }: {
    item: JasaItem;
    onClose: () => void;
    onTambahPembayaran: (item: JasaItem) => void;
    onKonfirmasiSelesai: (item: JasaItem) => void;
    isConfirmPending: boolean;
}) {
    const timelineLabels: [string, string, string, string] = ["Belum Bayar", "Diproses", "Dikerjakan", "Selesai"];
    const sudahDibayar = item.dp ?? item.total;
    const sisaBayar = item.total - sudahDibayar;
    const sedangDikerjakan = item.timelineStep === 2;

    return (
        <ModalShell title="Detail Pesanan" onClose={onClose}>
            <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-gray-500">
                    <p>Tanggal : {item.tanggal}</p>
                    <p>Invoice : {item.kodeInvoice}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === "lunas" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}>
                    {statusLabel(item.timelineStep, timelineLabels)}
                </span>
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mb-2">Detail Jasa</h3>
            <div className="bg-blue-50 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden shrink-0">
                        {item.thumbnail && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.thumbnail} alt={item.nama} className="w-full h-full object-cover" />
                        )}
                    </div>
                    <div>
                        <p className="text-base font-bold text-gray-900">{item.nama}</p>
                        <p className="text-sm text-gray-600 mt-1">Jumlah : {item.jumlah}</p>
                        <p className="text-sm text-gray-600">Total : {formatRupiah(item.total)}</p>
                    </div>
                </div>
                <div className="h-px bg-blue-100 my-4" />
                <OrderTimeline step={item.timelineStep} labels={timelineLabels} />
            </div>

            <div className="space-y-1.5 mb-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Total Biaya</span>
                    <span className="text-gray-800 font-medium">{formatRupiah(item.total)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">{item.status === "lunas" ? "Sudah Dibayar" : "DP Dibayar"}</span>
                    <span className="text-gray-800 font-medium">{formatRupiah(sudahDibayar)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <span className="text-gray-700 font-semibold">Sisa Pembayaran</span>
                    <span className="text-gray-900 font-bold">{sisaBayar > 0 ? formatRupiah(sisaBayar) : "Lunas"}</span>
                </div>
            </div>

            {item.riwayatPembayaran.length > 0 && (
                <>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Riwayat Pembayaran</h3>
                    <div className="space-y-2 mb-4">
                        {item.riwayatPembayaran.map((riwayat) => (
                            <div key={riwayat.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                                <div>
                                    <p className="font-medium text-gray-800">{formatRupiah(riwayat.nominal)} · {riwayat.metode}</p>
                                    <p className="text-gray-400">{riwayat.tanggal}</p>
                                </div>
                                {riwayat.buktiNama && <span className="text-gray-400 truncate max-w-30">{riwayat.buktiNama}</span>}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {sedangDikerjakan && (
                <Button
                    onClick={() => onKonfirmasiSelesai(item)}
                    disabled={isConfirmPending}
                    className="w-full mb-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
                >
                    <PackageCheck className="w-4 h-4" /> Pesanan Selesai
                </Button>
            )}

            {item.status === "berjalan" && (
                <Button onClick={() => onTambahPembayaran(item)} className="w-full mb-6 rounded-full bg-yellow-400 hover:bg-yellow-500 text-white gap-1.5">
                    <Wallet className="w-4 h-4" /> Tambah Pembayaran
                </Button>
            )}

            <h3 className="text-sm font-semibold text-gray-800 mb-2">Detail Pemesan</h3>
            <DetailRow label="Nama" value={item.pembeli.nama} />
            <DetailRow label="Nomor" value={item.pembeli.nomor} />
            <DetailRow label="E-mail" value={item.pembeli.email} />
            <DetailRow label="Alamat" value={item.pembeli.alamat} />

            <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-2">Detail Pengerjaan</h3>
            <DetailRow label="Lokasi" value={item.jadwal.lokasi} />
            <DetailRow label="Estimasi" value={item.jadwal.estimasi} />

            {item.rating && (
                <>
                    <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-2">Rating Kamu</h3>
                    <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < item.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                        ))}
                    </div>
                    {item.ulasan && <p className="text-xs text-gray-500 mb-2">{item.ulasan}</p>}
                    {item.fotoUlasan && item.fotoUlasan.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {item.fotoUlasan.map((f) => (
                                <div key={f.id} className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={f.url} alt="Foto ulasan" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {item.noWhatsapp && (
                <a href={waLinkPesanan(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 rounded-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2.5"
                >
                    Hubungi via WhatsApp
                </a>
            )}
        </ModalShell>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex text-xs mb-1.5">
            <span className="w-32 shrink-0 text-gray-500">{label}</span>
            <span className="text-gray-800">{value}</span>
        </div>
    );
}

function RatingModal({ items, onClose, onSave }: {
    items: RatingQueueItem[];
    onClose: () => void;
    onSave: (
        ratings: { produkId: string; itemStateId: string; rating: number; komentar: string }[],
        fotoBaru: File[],
        keepFotoIds: string[]
    ) => void;
}) {
    const [ratings, setRatings] = useState<Record<string, number>>(() =>
        Object.fromEntries(items.map((i) => [i.produkId, i.initialRating ?? 0]))
    );
    const [hoverMap, setHoverMap] = useState<Record<string, number>>({});
    const [deskripsi, setDeskripsi] = useState(items[0]?.initialUlasan ?? "");
    const [isPending, setIsPending] = useState(false);

    const fotoLamaAwal = items[0]?.initialFotoUlasan ?? [];
    const [fotoLamaKept, setFotoLamaKept] = useState<FotoUlasan[]>(fotoLamaAwal);
    const [fotoBaru, setFotoBaru] = useState<File[]>([]);
    const [previewBaru, setPreviewBaru] = useState<string[]>([]);
    const fotoInputRef = useRef<HTMLInputElement>(null);
    const totalFoto = fotoLamaKept.length + fotoBaru.length;

    const handlePilihFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const sisaSlot = MAX_FOTO_ULASAN - totalFoto;
        if (sisaSlot <= 0) {
            toast.error(`Maksimal ${MAX_FOTO_ULASAN} foto`);
            e.target.value = "";
            return;
        }

        const valid = files.slice(0, sisaSlot).filter((f) => {
            if (!f.type.startsWith("image/")) {
                toast.error(`${f.name} bukan file gambar`);
                return false;
            }
            if (f.size > MAX_FOTO_SIZE) {
                toast.error(`${f.name} melebihi 5MB`);
                return false;
            }
            return true;
        });

        setFotoBaru((prev) => [...prev, ...valid]);
        setPreviewBaru((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
        e.target.value = "";
    };

    const handleHapusFotoLama = (id: string) => {
        setFotoLamaKept((prev) => prev.filter((f) => f.id !== id));
    };

    const handleHapusFotoBaru = (index: number) => {
        setPreviewBaru((prev) => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
        setFotoBaru((prev) => prev.filter((_, i) => i !== index));
    };

    const semuaSudahDinilai = items.every((i) => (ratings[i.produkId] ?? 0) > 0);

    const handleSimpan = async () => {
        if (!semuaSudahDinilai) return;
        setIsPending(true);
        try {
            onSave(
                items.map((i) => ({
                    produkId: i.produkId,
                    itemStateId: i.itemStateId,
                    rating: ratings[i.produkId] ?? 0,
                    komentar: deskripsi,
                })),
                fotoBaru,
                fotoLamaKept.map((f) => f.id)
            );
        } finally {
            setIsPending(false);
        }
    };

    return (
        <ModalShell title="Beri Rating" onClose={onClose}>
            <p className="text-xs text-gray-400 mb-4">
                Pesananmu sudah {items.length > 1 ? "diterima" : "selesai"}. Bagaimana kualitasnya?
            </p>

            <div className="space-y-4 mb-5">
                {items.map((item) => (
                    <div key={item.produkId} className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                            {item.thumbnail && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.thumbnail} alt={item.nama} className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate mb-1">{item.nama}</p>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => {
                                    const starValue = i + 1;
                                    const current = hoverMap[item.produkId] || ratings[item.produkId] || 0;
                                    const active = starValue <= current;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setRatings((prev) => ({ ...prev, [item.produkId]: starValue }))}
                                            onMouseEnter={() => setHoverMap((prev) => ({ ...prev, [item.produkId]: starValue }))}
                                            onMouseLeave={() => setHoverMap((prev) => ({ ...prev, [item.produkId]: 0 }))}
                                            className="p-0.5"
                                        >
                                            <Star className={`w-5 h-5 transition-colors ${active ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mb-5">
                <label className="text-sm font-medium text-gray-800 block mb-2">Deskripsi</label>
                <Textarea
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Ceritakan pengalamanmu (opsional)"
                    className="min-h-25 resize-none rounded-xl"
                />
            </div>

            <div className="mb-5">
                <label className="text-sm font-medium text-gray-800 block mb-2">
                    Foto ({totalFoto}/{MAX_FOTO_ULASAN})
                </label>
                <div className="flex flex-wrap gap-2">
                    {fotoLamaKept.map((foto) => (
                        <div key={foto.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={foto.url} alt="Foto ulasan" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => handleHapusFotoLama(foto.id)}
                                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {previewBaru.map((src, i) => (
                        <div key={src} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="Foto baru" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => handleHapusFotoBaru(i)}
                                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {totalFoto < MAX_FOTO_ULASAN && (
                        <button
                            type="button"
                            onClick={() => fotoInputRef.current?.click()}
                            className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-400"
                        >
                            <Camera className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePilihFoto}
                />
                <p className="text-xs text-gray-400 mt-1.5">Opsional. Maks {MAX_FOTO_ULASAN} foto, tiap foto maks 5MB.</p>
            </div>

            <Button
                onClick={handleSimpan}
                disabled={!semuaSudahDinilai || isPending}
                className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
            >
                {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
        </ModalShell>
    );
}

// ==== Modal: Tambah Pembayaran Jasa (cicilan) via Snap ====
// Sudah tidak menampilkan info rekening/QRIS manual lagi — cukup input nominal,
// lalu Snap yang menampilkan semua pilihan metode pembayarannya sendiri.
function FormPembayaranModal({ item, onClose, onSave }: {
    item: JasaItem; onClose: () => void;
    onSave: (data: { nominal: number }) => void;
}) {
    const sudahDibayar = item.dp ?? 0;
    const sisaTagihan = item.total - sudahDibayar;

    const [nominal, setNominal] = useState<string>(String(sisaTagihan));
    const [isPending, setIsPending] = useState(false);

    const nominalAngka = Number(nominal) || 0;
    const isValid = nominalAngka > 0 && nominalAngka <= sisaTagihan;

    const handleSubmit = async () => {
        if (!isValid) return;
        setIsPending(true);
        try {
            onSave({ nominal: nominalAngka });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <ModalShell title="Tambah Pembayaran" onClose={onClose}>
            <div className="bg-yellow-50 rounded-xl p-4 mb-5 space-y-1 text-sm">
                <p className="font-semibold text-gray-800">{item.nama}</p>
                <div className="flex justify-between text-xs text-gray-600"><span>Total Biaya</span><span>{formatRupiah(item.total)}</span></div>
                <div className="flex justify-between text-xs text-gray-600"><span>Sudah Dibayar</span><span>{formatRupiah(sudahDibayar)}</span></div>
                <div className="flex justify-between text-xs font-semibold text-gray-800 border-t border-yellow-100 pt-1"><span>Kurang Bayar</span><span>{formatRupiah(sisaTagihan)}</span></div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm text-gray-600 font-medium block">Nominal Pembayaran</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">Rp</span>
                    <Input
                        type="number"
                        value={nominal}
                        onChange={(e) => setNominal(e.target.value)}
                        placeholder="Masukkan Nominal"
                        max={sisaTagihan}
                        className="pl-9 rounded-lg bg-gray-50 border-gray-200"
                    />
                </div>
                {nominalAngka > sisaTagihan && (
                    <p className="text-xs text-red-500">Nominal melebihi sisa tagihan ({formatRupiah(sisaTagihan)})</p>
                )}
                <p className="text-xs text-gray-400">Bisa dicicil (kurang dari sisa tagihan) atau langsung dilunasi.</p>
            </div>

            <p className="text-xs text-gray-400 mt-3">
                Setelah menekan Submit, jendela pembayaran akan terbuka untuk memilih metode
                pembayaran (transfer bank, QRIS, e-wallet, dll).
            </p>

            <Button onClick={handleSubmit} disabled={!isValid || isPending} className="w-full mt-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50">
                {isPending ? "Memproses..." : "Submit"}
            </Button>
        </ModalShell>
    );
}

function RefundStatusBadge({ status }: { status: StatusRefund }) {
    const cfg: Record<StatusRefund, { label: string; className: string }> = {
        Diajukan: { label: "Refund Diajukan", className: "bg-amber-50 text-amber-600" },
        Diproses: { label: "Refund Diproses", className: "bg-sky-50 text-sky-600" },
        Disetujui: { label: "Refund Disetujui", className: "bg-emerald-50 text-emerald-600" },
        Ditolak: { label: "Refund Ditolak", className: "bg-red-50 text-red-500" },
    };
    const c = cfg[status];
    return <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${c.className}`}>{c.label}</span>;
}

function RefundModal({
    orderId, namaPesanan, onClose, onSubmit,
}: {
    orderId: string;
    namaPesanan: string;
    onClose: () => void;
    onSubmit: (formData: FormData) => Promise<void>;
}) {
    const MAX_BUKTI = 5;
    const MAX_SIZE = 20 * 1024 * 1024;

    const [alasan, setAlasan] = useState("");
    const [deskripsi, setDeskripsi] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<{ url: string; tipe: "Foto" | "Video" }[]>([]);
    const [isPending, setIsPending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? []);
        if (picked.length === 0) return;

        const sisaSlot = MAX_BUKTI - files.length;
        if (sisaSlot <= 0) {
            toast.error(`Maksimal ${MAX_BUKTI} bukti`);
            e.target.value = "";
            return;
        }

        const valid = picked.slice(0, sisaSlot).filter((f) => {
            const isImage = f.type.startsWith("image/");
            const isVideo = f.type.startsWith("video/");
            if (!isImage && !isVideo) {
                toast.error(`${f.name} bukan foto atau video`);
                return false;
            }
            if (f.size > MAX_SIZE) {
                toast.error(`${f.name} melebihi 20MB`);
                return false;
            }
            return true;
        });

        setFiles((prev) => [...prev, ...valid]);
        setPreviews((prev) => [
            ...prev,
            ...valid.map((f) => ({
                url: URL.createObjectURL(f),
                tipe: (f.type.startsWith("video") ? "Video" : "Foto") as "Foto" | "Video",
            })),
        ]);
        e.target.value = "";
    };

    const handleHapusFile = (index: number) => {
        setPreviews((prev) => {
            URL.revokeObjectURL(prev[index].url);
            return prev.filter((_, i) => i !== index);
        });
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const isValid = alasan.trim() !== "" && deskripsi.trim() !== "" && files.length > 0;

    const handleSubmit = async () => {
        if (!isValid) return;
        setIsPending(true);
        const fd = new FormData();
        fd.append("orderId", orderId);
        fd.append("alasan", alasan);
        fd.append("deskripsi", deskripsi);
        files.forEach((f) => fd.append("bukti", f));
        try {
            await onSubmit(fd);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <ModalShell title="Ajukan Refund" onClose={onClose}>
            <p className="text-xs text-gray-400 mb-4">
                Ajukan refund untuk pesanan <span className="font-medium text-gray-600">{namaPesanan}</span>.
                Sertakan bukti (foto/video) dan deskripsi jelas agar cepat ditindaklanjuti toko.
            </p>

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-800">Alasan Refund</label>
                    <Input
                        value={alasan}
                        onChange={(e) => setAlasan(e.target.value)}
                        placeholder="Contoh: Barang rusak, tidak sesuai deskripsi, dll"
                        className="rounded-lg bg-gray-50 border-gray-200"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-800">Deskripsi</label>
                    <Textarea
                        value={deskripsi}
                        onChange={(e) => setDeskripsi(e.target.value)}
                        placeholder="Jelaskan detail masalahnya..."
                        className="min-h-25 resize-none rounded-xl bg-gray-50 border-gray-200"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-800">
                        Bukti Foto/Video ({files.length}/{MAX_BUKTI})
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {previews.map((p, i) => (
                            <div key={p.url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
                                {p.tipe === "Video" ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <VideoIcon className="w-6 h-6 text-white" />
                                    </div>
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.url} alt="Bukti" className="w-full h-full object-cover" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleHapusFile(i)}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        {files.length < MAX_BUKTI && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-400"
                            >
                                <Camera className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handlePilihFile}
                    />
                    <p className="text-xs text-gray-400">Wajib minimal 1 file. Maks {MAX_BUKTI} file, tiap file maks 20MB.</p>
                </div>
            </div>

            <Button
                onClick={handleSubmit}
                disabled={!isValid || isPending}
                className="w-full mt-5 rounded-full bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
            >
                {isPending ? "Mengirim..." : "Ajukan Refund"}
            </Button>
        </ModalShell>
    );
}