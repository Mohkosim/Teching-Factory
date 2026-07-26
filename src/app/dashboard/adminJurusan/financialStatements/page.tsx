"use client";

import { useRef, useState, useMemo } from "react";
import {
    Search,
    Plus,
    Eye,
    Pencil,
    Trash2,
    Printer,
    Download,
    Bell,
    Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import PaginationIconsOnly from "@/components/pagination/page";

// ── Tipe data transaksi keuangan ──
type JenisTransaksi = "Pemasukan" | "Pengeluaran";
type StatusSettlement = "Settled" | "Pending";

interface DetailPembeli {
    nama: string;
    nomor: string;
    email: string;
    alamat: string;
}

interface DetailPengiriman {
    kurir: string;
    nomorResi: string;
    estimasi: string;
}

interface HistoryUpdate {
    user: string;
    tanggal: string;
    waktu: string;
    keterangan: string;
    labelPerubahan: string; // mis. "Harga"
    dari: string;
    ke: string;
}

interface TransaksiItem {
    id: number;
    noInvoice: string;
    tanggal: string;
    kodeTransaksi: string;
    pembeliPemasok: string;
    jurusan: string;
    jenisTransaksi: JenisTransaksi;
    kategori: string;
    deskripsi: string;
    qty: number | string;
    hargaSatuan: number;
    total: number;
    metodePembayaran: string;
    statusSettlement: StatusSettlement;
    // ── Opsional: detail tambahan, isi dari API kalau sudah siap ──
    gambarUrl?: string;
    biayaOngkir?: number;
    pembeli?: DetailPembeli;
    pengiriman?: DetailPengiriman;
    historyPengeluaran?: HistoryUpdate[];
}

// ── Dummy data awal, ganti dengan fetch dari API (Laravel) kalau sudah siap ──
const initialTransaksiData: TransaksiItem[] = [
    {
        id: 1,
        noInvoice: "INV-TEFA-SMK01-001",
        tanggal: "22/08/2025",
        kodeTransaksi: "TRX-001",
        pembeliPemasok: "John Efendi",
        jurusan: "Jurusan 1",
        jenisTransaksi: "Pemasukan",
        kategori: "Produk",
        deskripsi: "Salad Sayur",
        qty: 1,
        hargaSatuan: 30000,
        total: 60000,
        metodePembayaran: "Bank BCA",
        statusSettlement: "Settled",
        gambarUrl: "/images/salad-sayur.jpg",
        biayaOngkir: 20000,
        pembeli: {
            nama: "John Efendi",
            nomor: "081232324141",
            email: "Johnefendi@gmail.com",
            alamat: "Jl Tanah Mas 37 Semarang, Jawa Tengah",
        },
        pengiriman: {
            kurir: "J&T",
            nomorResi: "439184194861234",
            estimasi: "3-4 Hari",
        },
    },
    { id: 2, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli Jasa 1", jurusan: "Jurusan 2", jenisTransaksi: "Pemasukan", kategori: "Jasa", deskripsi: "Service Laptop", qty: 1, hargaSatuan: 15000, total: 200000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
    {
        id: 3,
        noInvoice: "INV-TSTA-04KOI-05",
        tanggal: "10/04/2026",
        kodeTransaksi: "TRX-001",
        pembeliPemasok: "Guru 1",
        jurusan: "Jurusan 1",
        jenisTransaksi: "Pengeluaran",
        kategori: "Operasional",
        deskripsi: "",
        qty: "-",
        hargaSatuan: 0,
        total: 30000,
        metodePembayaran: "Bank BCA",
        statusSettlement: "Settled",
        gambarUrl: "/images/pembelian-barang.jpg",
        historyPengeluaran: [
            {
                user: "Anton",
                tanggal: "10 April 2026",
                waktu: "12:01:11",
                keterangan: "Gaji Karyawan",
                labelPerubahan: "Harga",
                dari: "500000",
                ke: "480000",
            },
            {
                user: "Kevin",
                tanggal: "13 April 2026",
                waktu: "12:01:11",
                keterangan: "Pembelian barang",
                labelPerubahan: "Harga",
                dari: "30000",
                ke: "48000",
            },
        ],
    },
    { id: 4, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli 1", jurusan: "Jurusan 1", jenisTransaksi: "Pemasukan", kategori: "Produk", deskripsi: "Salad Buah Keju", qty: 20, hargaSatuan: 15000, total: 300000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
    { id: 5, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli Jasa 1", jurusan: "Jurusan 1", jenisTransaksi: "Pemasukan", kategori: "Jasa", deskripsi: "Service Laptop", qty: 1, hargaSatuan: 15000, total: 200000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
];

// ── Ringkasan keuangan, ganti dengan agregasi dari API kalau sudah siap ──
const ringkasan = {
    totalPemasukan: 2530000,
    totalPengeluaran: 500000,
    get labaBersih() {
        return this.totalPemasukan - this.totalPengeluaran;
    },
};

// ── Format Rupiah ──
function formatRupiah(value: number | string) {
    const num = typeof value === "string" ? Number(value) : value;
    return new Intl.NumberFormat("id-ID").format(isNaN(num) ? 0 : num);
}

// ── Styling badge status settlement ──
function StatusSettlementBadge({ status }: { status: StatusSettlement }) {
    const styles: Record<StatusSettlement, string> = {
        Settled: "bg-emerald-100 text-emerald-600",
        Pending: "bg-amber-100 text-amber-600",
    };

    return (
        <span
            className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-medium ${styles[status]}`}
        >
            {status}
        </span>
    );
}

// ── Baris label/value sederhana (dipakai di Detail Pesanan / Pengeluaran) ──
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="font-medium text-gray-700">{value}</span>
        </div>
    );
}

// ── Nilai default form edit (dipakai untuk reset) ──
const emptyEditForm = {
    pembeliPemasok: "",
    kategori: "",
    deskripsi: "",
    qty: "",
    hargaSatuan: "",
    total: "",
    metodePembayaran: "",
    statusSettlement: "Settled" as StatusSettlement,
    tanggal: "",
};

export default function LaporanKeuangan() {
    const [transaksiData, setTransaksiData] = useState<TransaksiItem[]>(initialTransaksiData);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [kategoriFilter, setKategoriFilter] = useState<string>("semua");

    // ── Dialog Detail (Pesanan / Pengeluaran) ──
    const [detailItem, setDetailItem] = useState<TransaksiItem | null>(null);
    const [openHistory, setOpenHistory] = useState(false);

    // ── Dialog Tambah Pengeluaran ──
    const [openTambahPengeluaran, setOpenTambahPengeluaran] = useState(false);
    const [formNama, setFormNama] = useState("");
    const [formKeterangan, setFormKeterangan] = useState("Operasional");
    const [formDeskripsi, setFormDeskripsi] = useState("");
    const [formGambar, setFormGambar] = useState<File | null>(null);
    const [formTanggal, setFormTanggal] = useState("");
    const [formNominal, setFormNominal] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Dialog Edit Transaksi ──
    const [openEdit, setOpenEdit] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState(emptyEditForm);

    // ── Dialog Konfirmasi Hapus ──
    const [deleteTarget, setDeleteTarget] = useState<TransaksiItem | null>(null);

    // ── Perhitungan Laba Kotor & Laba Bersih ──
    // TODO: ganti dengan data agregasi dari API (Laravel) kalau sudah siap.
    const totalPemasukan = ringkasan.totalPemasukan;
    const hpp = transaksiData
        .filter((t) => t.jenisTransaksi === "Pengeluaran" && t.kategori === "Operasional")
        .reduce((sum, t) => sum + t.total, 0);
    const labaKotor = totalPemasukan - hpp;
    const totalPengeluaranOps = ringkasan.totalPengeluaran - hpp;
    const labaBersih = labaKotor - totalPengeluaranOps;

    const filtered = useMemo(() => {
        return transaksiData.filter((item) => {
            const matchSearch =
                item.noInvoice.toLowerCase().includes(search.toLowerCase()) ||
                item.pembeliPemasok.toLowerCase().includes(search.toLowerCase()) ||
                item.deskripsi.toLowerCase().includes(search.toLowerCase());
            const matchKategori =
                kategoriFilter === "semua" ||
                item.jenisTransaksi.toLowerCase() === kategoriFilter;
            return matchSearch && matchKategori;
        });
    }, [transaksiData, search, kategoriFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // ── Handler tabel: Lihat Detail ──
    const openDetail = (item: TransaksiItem) => setDetailItem(item);

    // ── Handler tabel: Edit ──
    const openEditForm = (item: TransaksiItem) => {
        setEditingId(item.id);
        setEditForm({
            pembeliPemasok: item.pembeliPemasok,
            kategori: item.kategori,
            deskripsi: item.deskripsi,
            qty: String(item.qty ?? ""),
            hargaSatuan: String(item.hargaSatuan ?? ""),
            total: String(item.total ?? ""),
            metodePembayaran: item.metodePembayaran,
            statusSettlement: item.statusSettlement,
            tanggal: item.tanggal,
        });
        setOpenEdit(true);
    };

    // TODO: PUT /api/transaksi/{id} ke Laravel dengan payload editForm
    const handleSimpanEdit = () => {
        if (editingId === null) return;

        setTransaksiData((prev) =>
            prev.map((item) =>
                item.id === editingId
                    ? {
                          ...item,
                          pembeliPemasok: editForm.pembeliPemasok,
                          kategori: editForm.kategori,
                          deskripsi: editForm.deskripsi,
                          qty: editForm.qty === "" ? item.qty : editForm.qty,
                          hargaSatuan: Number(editForm.hargaSatuan) || 0,
                          total: Number(editForm.total) || 0,
                          metodePembayaran: editForm.metodePembayaran,
                          statusSettlement: editForm.statusSettlement,
                          tanggal: editForm.tanggal,
                      }
                    : item
            )
        );

        setOpenEdit(false);
        setEditingId(null);
        setEditForm(emptyEditForm);
    };

    // ── Handler tabel: Hapus ──
    const openDeleteConfirm = (item: TransaksiItem) => setDeleteTarget(item);
    const closeDeleteConfirm = () => setDeleteTarget(null);

    // TODO: DELETE /api/transaksi/{id} ke Laravel
    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        setTransaksiData((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        setDeleteTarget(null);
    };

    // TODO: hubungkan ke endpoint cetak invoice (Laravel API) berdasarkan noInvoice
    const handleUnduhInvoice = () => {
        if (!detailItem) return;
        // TODO: window.open(`/api/invoice/${detailItem.noInvoice}/download`)
    };

    // ── Handler form Tambah Pengeluaran ──
    const resetFormPengeluaran = () => {
        setFormNama("");
        setFormKeterangan("Operasional");
        setFormDeskripsi("");
        setFormGambar(null);
        setFormTanggal("");
        setFormNominal("");
    };

    // TODO: kirim FormData (nama, keterangan, deskripsi, gambar, tanggal, nominal) ke API Laravel
    const handleSimpanPengeluaran = () => {
        const nominal = Number(formNominal) || 0;
        const newItem: TransaksiItem = {
            id: Math.max(0, ...transaksiData.map((t) => t.id)) + 1,
            noInvoice: `INV-TSTA-${Math.floor(Math.random() * 9000 + 1000)}`,
            tanggal: formTanggal || "-",
            kodeTransaksi: `TRX-${Math.floor(Math.random() * 900 + 100)}`,
            pembeliPemasok: formNama || "-",
            jurusan: "-",
            jenisTransaksi: "Pengeluaran",
            kategori: formKeterangan,
            deskripsi: formDeskripsi,
            qty: "-",
            hargaSatuan: 0,
            total: nominal,
            metodePembayaran: "-",
            statusSettlement: "Settled",
        };

        setTransaksiData((prev) => [newItem, ...prev]);
        resetFormPengeluaran();
        setOpenTambahPengeluaran(false);
    };

    return (
        <div className="space-y-6 px-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Laporan Keuangan
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Laporan</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Laporan keuangan</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ringkasan Laba Kotor */}
                <Card className="rounded-2xl shadow-sm border border-gray-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">
                            Ringkasan Laba Kotor
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground font-medium pb-2 border-b border-gray-100">
                            <span>Keterangan</span>
                            <span>Jumlah (Rp)</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Pemasukan</span>
                            <span>{formatRupiah(totalPemasukan)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Harga Pokok Penjualan (HPP)
                            </span>
                            <span>- {formatRupiah(hpp)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                            <span>Laba Kotor</span>
                            <span className="text-sky-600">{formatRupiah(labaKotor)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Ringkasan Laba Bersih */}
                <Card className="rounded-2xl shadow-sm border border-gray-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">
                            Ringkasan Laba Bersih
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground font-medium pb-2 border-b border-gray-100">
                            <span>Keterangan</span>
                            <span>Jumlah (Rp)</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Laba Kotor</span>
                            <span>{formatRupiah(labaKotor)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Total Pengeluaran Operasional
                            </span>
                            <span>- {formatRupiah(totalPengeluaranOps)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                            <span>Laba Bersih</span>
                            <span className="text-sky-600">{formatRupiah(labaBersih)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Card Tabel */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar: Search, date range, filter, tambah pengeluaran */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-50 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9 bg-gray-50 border-gray-200 rounded-full text-sm"
                            />
                        </div>

                        {/* TODO: ganti dengan komponen date-range picker asli (mis. react-day-picker) */}
                        <Button
                            variant="outline"
                            className="h-9 text-sm font-normal text-gray-500 bg-gray-50 border-gray-200 rounded-lg"
                        >
                            20/2/2025 - 25/2/2026
                        </Button>

                        <Select
                            value={kategoriFilter}
                            onValueChange={(v) => {
                                setKategoriFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-32 h-9 text-sm bg-gray-50 border-gray-200 rounded-lg">
                                <SelectValue placeholder="Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="semua">Semua</SelectItem>
                                <SelectItem value="pemasukan">Pemasukan</SelectItem>
                                <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={() => setOpenTambahPengeluaran(true)}
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 px-4 text-sm gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Pengeluaran
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">No. Invoice</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Tanggal</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Kode Transaksi</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Pembeli/Pemasok</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Jenis Transaksi</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Kategori</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Deskripsi</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 text-right whitespace-nowrap">Harga Satuan (Rp)</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 text-right whitespace-nowrap">Total (Rp)</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Metode Pembayaran</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 text-center whitespace-nowrap">Status Settlement</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 text-center whitespace-nowrap">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="text-center py-12 text-gray-400">
                                        Tidak ada data ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((item) => (
                                    <TableRow key={item.id} className="h-16 hover:bg-blue-50/30 transition-colors">
                                        <TableCell className="text-gray-500 py-4 px-6 whitespace-nowrap">{item.noInvoice}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.tanggal}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.kodeTransaksi}</TableCell>
                                        <TableCell className="font-medium text-gray-700 py-4 px-6 whitespace-nowrap">{item.pembeliPemasok}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.jenisTransaksi}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.kategori}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.deskripsi || "-"}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 text-right whitespace-nowrap">
                                            {item.hargaSatuan ? formatRupiah(item.hargaSatuan) : "-"}
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-700 py-4 px-6 text-right whitespace-nowrap">
                                            {formatRupiah(item.total)}
                                        </TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.metodePembayaran}</TableCell>
                                        <TableCell className="py-4 px-6">
                                            <div className="flex justify-center">
                                                <StatusSettlementBadge status={item.statusSettlement} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => openDetail(item)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => openEditForm(item)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-500 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteConfirm(item)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </div>

            {/* ══════════════ Dialog: Tambah Pengeluaran ══════════════ */}
            <Dialog
                open={openTambahPengeluaran}
                onOpenChange={(open) => {
                    setOpenTambahPengeluaran(open);
                    if (!open) resetFormPengeluaran();
                }}
            >
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0">
                        <DialogTitle className="text-sm font-semibold">
                            Tambah Pengeluaran
                        </DialogTitle>
                    </DialogHeader>

                    <div className="px-5 py-4 space-y-4 overflow-y-auto">
                        {/* Nama Pengeluaran */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Nama Pengeluaran
                            </label>
                            <Input
                                placeholder="Masukkan Nama Pengeluaran"
                                value={formNama}
                                onChange={(e) => setFormNama(e.target.value)}
                                className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                            />
                        </div>

                        {/* Keterangan */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Keterangan
                            </label>
                            <Select value={formKeterangan} onValueChange={setFormKeterangan}>
                                <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg text-sm">
                                    <SelectValue placeholder="Operasional" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Operasional">Operasional</SelectItem>
                                    <SelectItem value="Bahan Baku">Bahan Baku</SelectItem>
                                    <SelectItem value="Gaji Karyawan">Gaji Karyawan</SelectItem>
                                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Deskripsi Pengeluaran */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Deskripsi Pengeluaran
                            </label>
                            <Textarea
                                placeholder="Masukkan Deskripsi Pengeluaran"
                                value={formDeskripsi}
                                onChange={(e) => setFormDeskripsi(e.target.value)}
                                className="bg-gray-50 border-gray-200 rounded-lg text-sm min-h-24 resize-none"
                            />
                        </div>

                        {/* Upload Gambar */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Upload Gambar
                            </label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) setFormGambar(file);
                                }}
                                className="border border-dashed border-gray-300 rounded-lg py-7 flex flex-col items-center justify-center gap-2 bg-gray-50/60 cursor-pointer text-center px-4"
                            >
                                <p className="text-xs text-gray-500">
                                    {formGambar ? formGambar.name : "Seret dan letakkan file di sini"}
                                </p>
                                {!formGambar && (
                                    <p className="text-xs text-gray-400">atau klik untuk menelusuri</p>
                                )}
                                <Button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                    className="mt-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs h-8 px-4 rounded-full shadow-none"
                                >
                                    Upload
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => setFormGambar(e.target.files?.[0] ?? null)}
                                />
                            </div>
                        </div>

                        {/* Tanggal & Nominal */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Tanggal Pengeluaran
                                </label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        value={formTanggal}
                                        onChange={(e) => setFormTanggal(e.target.value)}
                                        className="bg-gray-50 border-gray-200 rounded-lg text-sm pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0"
                                    />
                                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Nominal
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                        Rp
                                    </span>
                                    <Input
                                        placeholder="Masukan Harga Produk"
                                        value={formNominal}
                                        onChange={(e) => setFormNominal(e.target.value)}
                                        className="bg-gray-50 border-gray-200 rounded-lg text-sm pl-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleSimpanPengeluaran}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full h-10 text-sm mt-2"
                        >
                            Simpan
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ══════════════ Dialog: Edit Transaksi ══════════════ */}
            <Dialog
                open={openEdit}
                onOpenChange={(open) => {
                    setOpenEdit(open);
                    if (!open) {
                        setEditingId(null);
                        setEditForm(emptyEditForm);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0">
                        <DialogTitle className="text-sm font-semibold">
                            Edit Transaksi
                        </DialogTitle>
                    </DialogHeader>

                    <div className="px-5 py-4 space-y-4 overflow-y-auto">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Pembeli/Pemasok
                            </label>
                            <Input
                                value={editForm.pembeliPemasok}
                                onChange={(e) =>
                                    setEditForm((f) => ({ ...f, pembeliPemasok: e.target.value }))
                                }
                                className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Kategori
                            </label>
                            <Input
                                value={editForm.kategori}
                                onChange={(e) =>
                                    setEditForm((f) => ({ ...f, kategori: e.target.value }))
                                }
                                className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Deskripsi
                            </label>
                            <Textarea
                                value={editForm.deskripsi}
                                onChange={(e) =>
                                    setEditForm((f) => ({ ...f, deskripsi: e.target.value }))
                                }
                                className="bg-gray-50 border-gray-200 rounded-lg text-sm min-h-20 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Qty
                                </label>
                                <Input
                                    value={editForm.qty}
                                    onChange={(e) =>
                                        setEditForm((f) => ({ ...f, qty: e.target.value }))
                                    }
                                    className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Tanggal
                                </label>
                                <Input
                                    value={editForm.tanggal}
                                    onChange={(e) =>
                                        setEditForm((f) => ({ ...f, tanggal: e.target.value }))
                                    }
                                    placeholder="dd/mm/yyyy"
                                    className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Harga Satuan (Rp)
                                </label>
                                <Input
                                    value={editForm.hargaSatuan}
                                    onChange={(e) =>
                                        setEditForm((f) => ({ ...f, hargaSatuan: e.target.value }))
                                    }
                                    className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Total (Rp)
                                </label>
                                <Input
                                    value={editForm.total}
                                    onChange={(e) =>
                                        setEditForm((f) => ({ ...f, total: e.target.value }))
                                    }
                                    className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Metode Pembayaran
                            </label>
                            <Input
                                value={editForm.metodePembayaran}
                                onChange={(e) =>
                                    setEditForm((f) => ({ ...f, metodePembayaran: e.target.value }))
                                }
                                className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Status Settlement
                            </label>
                            <Select
                                value={editForm.statusSettlement}
                                onValueChange={(v) =>
                                    setEditForm((f) => ({
                                        ...f,
                                        statusSettlement: v as StatusSettlement,
                                    }))
                                }
                            >
                                <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Settled">Settled</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleSimpanEdit}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full h-10 text-sm mt-2"
                        >
                            Simpan Perubahan
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ══════════════ Dialog: Konfirmasi Hapus ══════════════ */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDeleteConfirm()}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Transaksi</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500">
                        Apakah Anda yakin ingin menghapus transaksi{" "}
                        <span className="font-medium text-gray-700">
                            {deleteTarget?.noInvoice}
                        </span>{" "}
                        ({deleteTarget?.pembeliPemasok || "-"})? Tindakan ini tidak dapat
                        dibatalkan.
                    </p>
                    <DialogFooter>
                        <Button
                            onClick={closeDeleteConfirm}
                            variant="outline"
                            className="rounded-lg"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg"
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════ Dialog: Detail Pesanan / Detail Pengeluaran ══════════════ */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0 flex-row items-center justify-between">
                        <DialogTitle className="text-sm font-semibold">
                            {detailItem?.jenisTransaksi === "Pengeluaran" ? "Detail Pengeluaran" : "Detail Pesanan"}
                        </DialogTitle>
                        {detailItem?.jenisTransaksi === "Pengeluaran" && (
                            <button
                                onClick={() => setOpenHistory(true)}
                                className="h-7 w-7 mr-6 flex items-center justify-center rounded-full bg-sky-500 hover:bg-sky-600 text-white transition-colors"
                                title="Lihat History"
                            >
                                <Bell className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </DialogHeader>

                    {detailItem && detailItem.jenisTransaksi === "Pemasukan" && (
                        <div className="px-5 py-4 overflow-y-auto text-sm">
                            <p className="text-gray-600">
                                No. invoice : <span className="font-medium text-gray-800">{detailItem.noInvoice}</span>
                            </p>
                            <p className="text-gray-600">
                                Kode Transaksi : <span className="font-medium text-gray-800">{detailItem.kodeTransaksi}</span>
                            </p>
                            <p className="text-gray-600">
                                Tanggal : <span className="font-medium text-gray-800">{detailItem.tanggal}</span>
                            </p>

                            <Separator className="my-3" />

                            <p className="font-semibold text-gray-800 mb-2">Detail Produk</p>
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                    {detailItem.gambarUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={detailItem.gambarUrl} alt={detailItem.deskripsi} className="h-full w-full object-cover" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 uppercase text-xs">{detailItem.deskripsi}</p>
                                    <p className="text-xs text-gray-500">Jumlah : {detailItem.qty}</p>
                                    <p className="text-xs text-gray-500">Harga : Rp {formatRupiah(detailItem.hargaSatuan)}</p>
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <InfoRow label="Metode Pembayaran" value={detailItem.metodePembayaran} />
                                <InfoRow label="Sub Total" value={`Rp ${formatRupiah(detailItem.hargaSatuan)}`} />
                                <InfoRow label="Biaya Ongkir" value={`Rp ${formatRupiah(detailItem.biayaOngkir ?? 0)}`} />
                                <InfoRow label="Total" value={`Rp ${formatRupiah(detailItem.total)}`} />
                            </div>

                            {detailItem.pembeli && (
                                <>
                                    <Separator className="my-3" />
                                    <p className="font-semibold text-gray-800 mb-1">Detail Pembeli</p>
                                    <InfoRow label="Nama" value={detailItem.pembeli.nama} />
                                    <InfoRow label="Nomor" value={detailItem.pembeli.nomor} />
                                    <InfoRow label="E-mail" value={detailItem.pembeli.email} />
                                    <InfoRow label="Alamat" value={detailItem.pembeli.alamat} />
                                </>
                            )}

                            {detailItem.pengiriman && (
                                <>
                                    <Separator className="my-3" />
                                    <p className="font-semibold text-gray-800 mb-1">Detail Pengiriman</p>
                                    <InfoRow label="Kurir" value={detailItem.pengiriman.kurir} />
                                    <InfoRow label="Nomor Resi" value={detailItem.pengiriman.nomorResi} />
                                    <InfoRow label="Estimasi" value={detailItem.pengiriman.estimasi} />
                                </>
                            )}

                            <div className="flex justify-end pt-4">
                                <Button
                                    onClick={handleUnduhInvoice}
                                    className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-8 px-4 text-xs gap-1.5"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Unduh Invoice
                                </Button>
                            </div>
                        </div>
                    )}

                    {detailItem && detailItem.jenisTransaksi === "Pengeluaran" && (
                        <div className="px-5 py-4 overflow-y-auto text-sm">
                            <div className="flex items-start gap-3">
                                <div className="h-14 w-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                    {detailItem.gambarUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={detailItem.gambarUrl} alt={detailItem.pembeliPemasok} className="h-full w-full object-cover" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{detailItem.pembeliPemasok || "Pembelian barang"}</p>
                                    <p className="text-xs text-gray-500">Tanggal : {detailItem.tanggal}</p>
                                    <p className="text-xs text-gray-500">Keterangan : {detailItem.kategori}</p>
                                    <p className="text-xs text-gray-500">Harga : Rp {formatRupiah(detailItem.total)}</p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-1.5">
                                <p className="font-medium text-gray-700 text-sm">Deskripsi</p>
                                <div className="bg-sky-50/60 border border-sky-100 rounded-lg p-3 min-h-24 text-xs text-gray-600">
                                    {detailItem.deskripsi || "-"}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ══════════════ Dialog: History Pengeluaran ══════════════ */}
            <Dialog open={openHistory} onOpenChange={setOpenHistory}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0">
                        <DialogTitle className="text-sm font-semibold">History</DialogTitle>
                    </DialogHeader>

                    <div className="px-5 py-4 overflow-y-auto space-y-3">
                        {(detailItem?.historyPengeluaran ?? []).length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-6">Belum ada riwayat perubahan</p>
                        )}
                        {(detailItem?.historyPengeluaran ?? []).map((h, idx) => (
                            <div key={idx} className="bg-sky-50/60 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-800">{h.user}</span>
                                    <span className="text-gray-400">{h.waktu}</span>
                                </div>
                                <p>Tanggal : {h.tanggal}</p>
                                <p>Keterangan : {h.keterangan}</p>
                                <p className="pt-1">Update :</p>
                                <div className="bg-sky-500 text-white rounded-md px-2.5 py-1 inline-block text-[11px]">
                                    {h.labelPerubahan}: {h.dari} to {h.ke}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}