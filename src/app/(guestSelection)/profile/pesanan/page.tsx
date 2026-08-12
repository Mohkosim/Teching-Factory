"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// ==== Types ====
interface ProdukItem {
    id: string;
    produkId: string; // id produk asli untuk navigasi "Beli Lagi" (beda dari id pesanan)
    nama: string;
    harga: string;
    hargaAngka: number;
    thumbnail: string;
    jumlah: number;
    statusBayar: "Dibayar" | "Belum Dibayar";
    statusKirim: "Telah Dikirim" | "Sedang Dikirim" | "Diproses";
    tanggal: string;
    // detail tambahan untuk modal
    timelineStep: 0 | 1 | 2 | 3; // 0=Belum Bayar,1=Diproses,2=Dikirim,3=Diterima
    biayaOngkir: number;
    pembeli: {
        nama: string;
        nomor: string;
        email: string;
        alamat: string;
    };
    pengiriman: {
        kurir: string;
        nomorResi: string;
        estimasi: string;
    };
}

interface JasaItem {
    id: string;
    nama: string;
    total: number;
    thumbnail: string;
    dp?: number;
    progress: number; // 0 - 100
    status: "berjalan" | "lunas";
    keterangan: string;
    tanggal: string;
    jumlah: number;
    timelineStep: 0 | 1 | 2 | 3; // 0=Belum Bayar,1=Diproses,2=Dikerjakan,3=Selesai
    pembeli: {
        nama: string;
        nomor: string;
        email: string;
        alamat: string;
    };
    jadwal: {
        tanggalPengerjaan: string;
        lokasi: string;
        estimasi: string;
    };
    rating?: number;
    ulasan?: string;
}

// ==== Dummy data (nanti diganti fetch API asli) ====
const DUMMY_PRODUK: ProdukItem[] = Array.from({ length: 9 }).map((_, i) => ({
    id: `produk-${i}`,
    produkId: "kemeja-biru", // slug/id produk asli di katalog
    nama: "Kemeja Biru",
    harga: "Rp 30.000",
    hargaAngka: 30000,
    thumbnail: "/dummy/kemeja.jpg",
    jumlah: 1,
    statusBayar: "Dibayar",
    statusKirim: "Telah Dikirim",
    tanggal: "22 Agustus 2025",
    timelineStep: 2,
    biayaOngkir: 20000,
    pembeli: {
        nama: "John Efendi",
        nomor: "081233234141",
        email: "johnefendi@gmail.com",
        alamat: "Jl Tanah Mas 37 Semarang, Jawa Tengah",
    },
    pengiriman: {
        kurir: "J&T",
        nomorResi: "439184194861234",
        estimasi: "3-4 Hari",
    },
}));

const DUMMY_JASA: JasaItem[] = [
    {
        id: "jasa-1",
        nama: "Bento cake",
        total: 50000,
        thumbnail: "/dummy/bento1.jpg",
        dp: 25000,
        progress: 50,
        status: "berjalan",
        keterangan: "DP Rp 25.000 dari Rp 50.000",
        tanggal: "22 Agustus 2025",
        jumlah: 1,
        timelineStep: 1,
        pembeli: {
            nama: "John Efendi",
            nomor: "081233234141",
            email: "johnefendi@gmail.com",
            alamat: "Jl Tanah Mas 37 Semarang, Jawa Tengah",
        },
        jadwal: {
            tanggalPengerjaan: "25 Agustus 2025",
            lokasi: "Diambil di toko",
            estimasi: "3 Hari",
        },
    },
    {
        id: "jasa-2",
        nama: "Bento cake",
        total: 150000,
        thumbnail: "/dummy/bento2.jpg",
        progress: 100,
        status: "lunas",
        keterangan: "Lunas - pesanan diselesaikan",
        tanggal: "10 Agustus 2025",
        jumlah: 2,
        timelineStep: 3,
        pembeli: {
            nama: "John Efendi",
            nomor: "081233234141",
            email: "johnefendi@gmail.com",
            alamat: "Jl Tanah Mas 37 Semarang, Jawa Tengah",
        },
        jadwal: {
            tanggalPengerjaan: "12 Agustus 2025",
            lokasi: "Diambil di toko",
            estimasi: "Selesai",
        },
    },
];

function formatRupiah(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function PesananPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"produk" | "jasa">("produk");
    const [search, setSearch] = useState("");

    // data lokal biar rating bisa "tersimpan" di UI
    const [produkData] = useState<ProdukItem[]>(DUMMY_PRODUK);
    const [jasaData, setJasaData] = useState<JasaItem[]>(DUMMY_JASA);

    // modal state
    const [selectedProduk, setSelectedProduk] = useState<ProdukItem | null>(null);
    const [selectedJasaDetail, setSelectedJasaDetail] = useState<JasaItem | null>(null);
    const [ratingTarget, setRatingTarget] = useState<JasaItem | null>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSaveRating = (rating: number, deskripsi: string) => {
        if (!ratingTarget) return;
        setJasaData((prev) =>
            prev.map((j) =>
                j.id === ratingTarget.id ? { ...j, rating, ulasan: deskripsi } : j
            )
        );
        setRatingTarget(null);
    };

    // "Beli Lagi" langsung membawa user ke halaman detail produk (bukan modal)
    // supaya bisa langsung checkout ulang dari sana.
    const handleBeliLagi = (item: ProdukItem) => {
        router.push(`/produk/${item.produkId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 md:px-8">
            {/* Breadcrumb */}
            <div className="max-w-6xl mx-auto flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Pesanan</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>
                                {activeTab === "produk" ? "Produk" : "Jasa"}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
                <ProfileSidebar
                    avatarPreview={avatarPreview}
                    onAvatarClick={handleAvatarClick}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                />

                <section className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                    <h1 className="text-xl font-bold text-gray-900 mb-4">Pesanan Saya</h1>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 border-b border-gray-200 mb-5">
                        <button
                            onClick={() => setActiveTab("produk")}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === "produk"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Produk
                        </button>
                        <button
                            onClick={() => setActiveTab("jasa")}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === "jasa"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Jasa
                        </button>
                    </div>

                    {/* Search + Filter */}
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

                    {/* Content */}
                    {activeTab === "produk" ? (
                        <ProdukList
                            items={produkData}
                            onLihatDetail={(item) => setSelectedProduk(item)}
                            onBeliLagi={handleBeliLagi}
                        />
                    ) : (
                        <JasaList
                            items={jasaData}
                            onLihatDetail={(item) => setSelectedJasaDetail(item)}
                            onBeriNilai={(item) => setRatingTarget(item)}
                        />
                    )}
                </section>
            </div>

            {/* Modal Detail Produk */}
            {selectedProduk && (
                <DetailProdukModal
                    item={selectedProduk}
                    onClose={() => setSelectedProduk(null)}
                />
            )}

            {/* Modal Detail Jasa */}
            {selectedJasaDetail && (
                <DetailJasaModal
                    item={selectedJasaDetail}
                    onClose={() => setSelectedJasaDetail(null)}
                />
            )}

            {/* Modal Rating */}
            {ratingTarget && (
                <RatingModal
                    onClose={() => setRatingTarget(null)}
                    onSave={handleSaveRating}
                />
            )}
        </div>
    );
}

// ==== Tab: Produk ====
function ProdukList({
    items,
    onLihatDetail,
    onBeliLagi,
}: {
    items: ProdukItem[];
    onLihatDetail: (item: ProdukItem) => void;
    onBeliLagi: (item: ProdukItem) => void;
}) {
    if (items.length === 0) {
        return <EmptyState text="Belum ada pesanan produk" />;
    }

    return (
        <div className="divide-y divide-gray-100">
            {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                    <div className="flex items-center gap-3 w-1/4 min-w-[180px]">
                        <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-gray-800">{item.nama}</p>
                            <p className="text-xs text-gray-500">{item.harga}</p>
                        </div>
                    </div>

                    <div className="flex-1">
                        <span className="inline-block px-3 py-1 rounded-md bg-green-50 text-green-600 text-xs font-medium">
                            {item.statusBayar}
                        </span>
                    </div>

                    <div className="flex-1">
                        <span className="text-xs font-medium text-green-600">
                            {item.statusKirim}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => onLihatDetail(item)}
                            className="rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-4"
                        >
                            Lihat Detail
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBeliLagi(item)}
                            className="rounded-full text-blue-500 border-blue-300 text-xs px-4"
                        >
                            Beli Lagi
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ==== Tab: Jasa ====
function JasaList({
    items,
    onLihatDetail,
    onBeriNilai,
}: {
    items: JasaItem[];
    onLihatDetail: (item: JasaItem) => void;
    onBeriNilai: (item: JasaItem) => void;
}) {
    if (items.length === 0) {
        return <EmptyState text="Belum ada pesanan jasa" />;
    }

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-none"
                >
                    <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0" />

                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{item.nama}</p>
                        <p className="text-xs text-gray-500 mb-2">
                            Total {formatRupiah(item.total)}
                        </p>

                        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${
                                    item.status === "lunas" ? "bg-green-500" : "bg-yellow-400"
                                }`}
                                style={{ width: `${item.progress}%` }}
                            />
                        </div>

                        <p
                            className={`text-xs mt-1 ${
                                item.status === "lunas" ? "text-green-600" : "text-gray-500"
                            }`}
                        >
                            {item.rating
                                ? `Rating kamu: ${item.rating}/5`
                                : item.keterangan}
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={item.status !== "lunas"}
                            onClick={() => onBeriNilai(item)}
                            className="rounded-full text-blue-500 border-blue-300 text-xs px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {item.rating ? "Ubah Nilai" : "Beri Nilai"}
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => onLihatDetail(item)}
                            className="rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-4"
                        >
                            Lihat Detail
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
            {text}
        </div>
    );
}

// ==== Shared modal shell ====
function ModalShell({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                    <h2 className="text-base font-bold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

// ==== Timeline pesanan (dipakai di kedua modal, label beda) ====
function OrderTimeline({
    step,
    labels,
}: {
    step: 0 | 1 | 2 | 3;
    labels: [string, string, string, string];
}) {
    return (
        <div className="w-full">
            <p className="text-sm font-bold text-gray-800 mb-4">Timeline Pesanan</p>

            {/* Baris 1: HANYA dot + garis — tidak ada teks di baris ini sama sekali,
                jadi tinggi baris murni ditentukan oleh dot (seragam), dan garis
                otomatis sejajar sempurna dengan pusat setiap dot. */}
            <div className="flex items-center w-full">
                {labels.map((label, i) => {
                    const isDone = i < step;
                    const isCurrent = i === step;
                    const isLast = i === labels.length - 1;

                    return (
                        <div key={`dot-${label}`} className="contents">
                            <div
                                className={`flex justify-center ${
                                    isLast ? "flex-none w-14" : "flex-1"
                                }`}
                            >
                                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                    <div
                                        className={`rounded-full transition-all ${
                                            isCurrent
                                                ? "w-4 h-4 bg-sky-400 ring-4 ring-sky-100"
                                                : isDone
                                                ? "w-3.5 h-3.5 bg-slate-800"
                                                : "w-3.5 h-3.5 bg-gray-300"
                                        }`}
                                    />
                                </div>
                            </div>
                            {!isLast && (
                                <div
                                    className={`flex-1 h-[2px] ${
                                        i < step
                                            ? "bg-slate-800"
                                            : "border-t-2 border-dashed border-gray-300"
                                    }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Baris 2: label — memakai kolom lebar yang identik dengan baris dot
                di atasnya (flex-1 / w-14 untuk kolom terakhir) supaya tiap teks
                presisi berada tepat di bawah dot masing-masing. */}
            <div className="flex items-start w-full mt-2">
                {labels.map((label, i) => {
                    const isFuture = i > step;
                    const isLast = i === labels.length - 1;

                    return (
                        <div key={`label-${label}`} className="contents">
                            <div
                                className={`flex justify-center ${
                                    isLast ? "flex-none w-14" : "flex-1"
                                }`}
                            >
                                <span
                                    className={`text-[11px] text-center leading-tight ${
                                        isFuture
                                            ? "text-gray-400 font-normal"
                                            : "text-gray-800 font-semibold"
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                            {!isLast && <div className="flex-1" />}
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

// ==== Modal: Detail Pesanan Produk ====
function DetailProdukModal({
    item,
    onClose,
}: {
    item: ProdukItem;
    onClose: () => void;
}) {
    const timelineLabels: [string, string, string, string] = [
        "Belum Membayar",
        "Diproses",
        "Dikirim",
        "Diterima",
    ];
    const subTotal = item.hargaAngka * item.jumlah;
    const total = subTotal + item.biayaOngkir;

    return (
        <ModalShell title="Detail Pesanan" onClose={onClose}>
            <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-gray-500">
                    <p>Tanggal : {item.tanggal}</p>
                    <p>ID : {item.id}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                    {statusLabel(item.timelineStep, timelineLabels)}
                </span>
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mb-2">Detail Produk</h3>
            <div className="bg-blue-50 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden shrink-0" />
                    <div>
                        <p className="text-base font-bold text-gray-900">{item.nama}</p>
                        <p className="text-sm text-gray-600 mt-1">Jumlah : {item.jumlah}</p>
                        <p className="text-sm text-gray-600">Harga : {item.harga}</p>
                    </div>
                </div>
                <div className="h-px bg-blue-100 my-4" />
                <OrderTimeline step={item.timelineStep} labels={timelineLabels} />
            </div>

            <div className="space-y-1.5 mb-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Sub Total</span>
                    <span className="text-gray-800 font-medium">{formatRupiah(subTotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Biaya Ongkir</span>
                    <span className="text-gray-800 font-medium">
                        {formatRupiah(item.biayaOngkir)}
                    </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <span className="text-gray-700 font-semibold">Total</span>
                    <span className="text-gray-900 font-bold">{formatRupiah(total)}</span>
                </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mb-2">Detail Pembeli</h3>
            <DetailRow label="Nama" value={item.pembeli.nama} />
            <DetailRow label="Nomor" value={item.pembeli.nomor} />
            <DetailRow label="E-mail" value={item.pembeli.email} />
            <DetailRow label="Alamat" value={item.pembeli.alamat} />

            <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-2">
                Detail Pengiriman
            </h3>
            <DetailRow label="Kurir" value={item.pengiriman.kurir} />
            <DetailRow label="Nomor Resi" value={item.pengiriman.nomorResi} />
            <DetailRow label="Estimasi" value={item.pengiriman.estimasi} />
        </ModalShell>
    );
}

// ==== Modal: Detail Pesanan Jasa ====
function DetailJasaModal({
    item,
    onClose,
}: {
    item: JasaItem;
    onClose: () => void;
}) {
    const timelineLabels: [string, string, string, string] = [
        "Belum Bayar",
        "Diproses",
        "Dikerjakan",
        "Selesai",
    ];
    const sudahDibayar = item.dp ?? item.total;
    const sisaBayar = item.total - sudahDibayar;

    return (
        <ModalShell title="Detail Pesanan" onClose={onClose}>
            <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-gray-500">
                    <p>Tanggal : {item.tanggal}</p>
                    <p>ID : {item.id}</p>
                </div>
                <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === "lunas"
                            ? "bg-green-50 text-green-600"
                            : "bg-yellow-50 text-yellow-600"
                    }`}
                >
                    {statusLabel(item.timelineStep, timelineLabels)}
                </span>
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mb-2">Detail Jasa</h3>
            <div className="bg-blue-50 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden shrink-0" />
                    <div>
                        <p className="text-base font-bold text-gray-900">{item.nama}</p>
                        <p className="text-sm text-gray-600 mt-1">Jumlah : {item.jumlah}</p>
                        <p className="text-sm text-gray-600">
                            Total : {formatRupiah(item.total)}
                        </p>
                    </div>
                </div>
                <div className="h-px bg-blue-100 my-4" />
                <OrderTimeline step={item.timelineStep} labels={timelineLabels} />
            </div>

            <div className="space-y-1.5 mb-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Total Biaya</span>
                    <span className="text-gray-800 font-medium">
                        {formatRupiah(item.total)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">
                        {item.status === "lunas" ? "Sudah Dibayar" : "DP Dibayar"}
                    </span>
                    <span className="text-gray-800 font-medium">
                        {formatRupiah(sudahDibayar)}
                    </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <span className="text-gray-700 font-semibold">Sisa Pembayaran</span>
                    <span className="text-gray-900 font-bold">
                        {sisaBayar > 0 ? formatRupiah(sisaBayar) : "Lunas"}
                    </span>
                </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mb-2">Detail Pemesan</h3>
            <DetailRow label="Nama" value={item.pembeli.nama} />
            <DetailRow label="Nomor" value={item.pembeli.nomor} />
            <DetailRow label="E-mail" value={item.pembeli.email} />
            <DetailRow label="Alamat" value={item.pembeli.alamat} />

            <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-2">
                Detail Pengerjaan
            </h3>
            <DetailRow label="Tanggal Pengerjaan" value={item.jadwal.tanggalPengerjaan} />
            <DetailRow label="Lokasi" value={item.jadwal.lokasi} />
            <DetailRow label="Estimasi" value={item.jadwal.estimasi} />

            {item.rating && (
                <>
                    <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-2">
                        Rating Kamu
                    </h3>
                    <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                                key={i}
                                className={`w-4 h-4 ${
                                    i < item.rating!
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                }`}
                            />
                        ))}
                    </div>
                    {item.ulasan && (
                        <p className="text-xs text-gray-500">{item.ulasan}</p>
                    )}
                </>
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

// ==== Modal: Rating ====
function RatingModal({
    onClose,
    onSave,
}: {
    onClose: () => void;
    onSave: (rating: number, deskripsi: string) => void;
}) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [deskripsi, setDeskripsi] = useState("");

    const handleSimpan = () => {
        if (rating === 0) return;
        onSave(rating, deskripsi);
    };

    return (
        <ModalShell title="Rating" onClose={onClose}>
            <div className="mb-5">
                <label className="text-sm font-medium text-gray-800 block mb-2">
                    Rating
                </label>
                <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => {
                        const starValue = i + 1;
                        const active = starValue <= (hoverRating || rating);
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setRating(starValue)}
                                onMouseEnter={() => setHoverRating(starValue)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-0.5"
                            >
                                <Star
                                    className={`w-7 h-7 transition-colors ${
                                        active
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-300"
                                    }`}
                                />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mb-5">
                <label className="text-sm font-medium text-gray-800 block mb-2">
                    Deskripsi
                </label>
                <Textarea
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Deskripsi singkat"
                    className="min-h-[100px] resize-none rounded-xl"
                />
            </div>

            <Button
                onClick={handleSimpan}
                disabled={rating === 0}
                className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
            >
                Simpan
            </Button>
        </ModalShell>
    );
}