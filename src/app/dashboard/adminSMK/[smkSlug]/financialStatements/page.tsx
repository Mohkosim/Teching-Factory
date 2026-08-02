"use client";

import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, FileDown, MoreVertical, Printer } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
}

// ── Dummy data, ganti dengan fetch dari API (Laravel) kalau sudah siap ──
const transaksiData: TransaksiItem[] = [
    { id: 1, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli 1", jurusan: "Jurusan 1", jenisTransaksi: "Pemasukan", kategori: "Produk", deskripsi: "Salad Buah Keju", qty: 20, hargaSatuan: 15000, total: 300000, metodePembayaran: "Bank BNI", statusSettlement: "Settled" },
    { id: 2, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli Jasa 1", jurusan: "Jurusan 2", jenisTransaksi: "Pemasukan", kategori: "Jasa", deskripsi: "Service Laptop", qty: 1, hargaSatuan: 15000, total: 200000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
    { id: 3, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Guru 1", jurusan: "Jurusan 1", jenisTransaksi: "Pengeluaran", kategori: "Operasional", deskripsi: "Bahan Baku Buah & Keju", qty: "-", hargaSatuan: 0, total: 250000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
    { id: 4, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli 1", jurusan: "Jurusan 1", jenisTransaksi: "Pemasukan", kategori: "Produk", deskripsi: "Salad Buah Keju", qty: 20, hargaSatuan: 15000, total: 300000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
    { id: 5, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli Jasa 1", jurusan: "Jurusan 1", jenisTransaksi: "Pemasukan", kategori: "Jasa", deskripsi: "Service Laptop", qty: 1, hargaSatuan: 15000, total: 200000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
    { id: 6, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli 1", jurusan: "Jurusan 1", jenisTransaksi: "Pemasukan", kategori: "Produk", deskripsi: "Salad Buah Keju", qty: 20, hargaSatuan: 15000, total: 300000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
    { id: 7, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli 1", jurusan: "Jurusan 1", jenisTransaksi: "Pemasukan", kategori: "Produk", deskripsi: "Salad Buah Keju", qty: 20, hargaSatuan: 15000, total: 300000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
    { id: 8, noInvoice: "INV-TSTA-04KOI-05", tanggal: "12/12/2025", kodeTransaksi: "TRX-001", pembeliPemasok: "Pembeli 1", jurusan: "Jurusan 1", jenisTransaksi: "Pemasukan", kategori: "Produk", deskripsi: "Salad Buah Keju", qty: 20, hargaSatuan: 15000, total: 300000, metodePembayaran: "Bank BCA", statusSettlement: "Settled" },
];

// ── Ringkasan keuangan, ganti dengan agregasi dari API kalau sudah siap ──
const ringkasan = {
    totalPemasukan: 2530000,
    totalPengeluaran: 500000,
    get labaBersih() {
        return this.totalPemasukan - this.totalPengeluaran;
    },
};

const pengeluaranBreakdown = {
    total: 500000,
    persen: 76,
    data: [
        { name: "Pengeluaran Bahan Baku", value: 76, color: "#f87171" },
        { name: "Pengeluaran Operasional", value: 24, color: "#e5e7eb" },
    ],
};

const pemasukanBreakdown = {
    total: 2000000,
    persen: 86,
    data: [
        { name: "Pemasukan Produk", value: 86, color: "#38bdf8" },
        { name: "Pemasukan Jasa", value: 14, color: "#e5e7eb" },
    ],
};

// ── Format Rupiah ──
function formatRupiah(value: number) {
    return new Intl.NumberFormat("id-ID").format(value);
}

// ── Kartu donut chart kecil untuk ringkasan Pengeluaran / Pemasukan ──
function DonutSummaryCard({
    title,
    subtitleLabel,
    total,
    persen,
    data,
}: {
    title: string;
    subtitleLabel: string;
    total: number;
    persen: number;
    data: { name: string; value: number; color: string }[];
}) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1 min-w-[240px]">
            <p className="text-sm font-semibold text-gray-700">{title}</p>
            <p className="text-xs text-gray-400 mb-3">
                {subtitleLabel}: Rp {formatRupiah(total)}
            </p>
            <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 shrink-0">
                    <PieChart width={96} height={96}>
                        <Pie
                            data={data}
                            dataKey="value"
                            innerRadius={32}
                            outerRadius={46}
                            startAngle={90}
                            endAngle={-270}
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-700">{persen}%</span>
                    </div>
                </div>
                <div className="space-y-1.5">
                    {data.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2">
                            <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs text-gray-500">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
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

// ── Styling badge jenis transaksi (dipakai di dalam dialog detail) ──
function JenisTransaksiBadge({ jenis }: { jenis: JenisTransaksi }) {
    const styles: Record<JenisTransaksi, string> = {
        Pemasukan: "bg-sky-100 text-sky-600",
        Pengeluaran: "bg-red-100 text-red-500",
    };

    return (
        <span
            className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-medium ${styles[jenis]}`}
        >
            {jenis}
        </span>
    );
}

// ── Baris label/value dalam dialog detail ──
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-2 gap-4 py-1.5">
            <span className="text-xs text-gray-400">{label}</span>
            <span className="text-sm font-medium text-gray-700 text-right">{value}</span>
        </div>
    );
}

export default function LaporanKeuangan() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [kategoriFilter, setKategoriFilter] = useState<string>("semua");
    const [detailItem, setDetailItem] = useState<TransaksiItem | null>(null);

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
    }, [search, kategoriFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const getPageNumbers = () => {
        const pages: number[] = [];
        const start = Math.max(1, page - 1);
        const end = Math.min(totalPages, start + 2);
        for (let p = start; p <= end; p++) pages.push(p);
        return pages;
    };

    // TODO: hubungkan ke endpoint export PDF (Laravel API) sesuai filter & rentang tanggal aktif
    const handleExportPDF = () => {
        // TODO: panggil endpoint export, contoh: /api/laporan-keuangan/export?start=...&end=...
    };

    // TODO: hubungkan ke endpoint cetak invoice (Laravel API) berdasarkan noInvoice
    const handleCetakInvoice = () => {
        if (!detailItem) return;
        // TODO: window.open(`/api/invoice/${detailItem.noInvoice}/print`)
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

            {/* Ringkasan: tabel Keterangan/Jumlah + 2 donut chart */}
            <div className="flex flex-wrap gap-4">
                {/* Kartu Keterangan / Jumlah */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-[1.4] min-w-[280px]">
                    <div className="grid grid-cols-2 px-5 py-3 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-700">Keterangan</span>
                        <span className="text-sm font-semibold text-gray-700">Jumlah (Rp)</span>
                    </div>
                    <div className="grid grid-cols-2 px-5 py-3 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Total Pemasukan</span>
                        <span className="text-sm text-gray-700">{formatRupiah(ringkasan.totalPemasukan)}</span>
                    </div>
                    <div className="grid grid-cols-2 px-5 py-3 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Total Pengeluaran</span>
                        <span className="text-sm text-gray-700">{formatRupiah(ringkasan.totalPengeluaran)}</span>
                    </div>
                    <div className="grid grid-cols-2 px-5 py-3">
                        <span className="text-sm font-bold text-gray-700">Laba Bersih</span>
                        <span className="text-sm font-bold text-gray-700">{formatRupiah(ringkasan.labaBersih)}</span>
                    </div>
                </div>

                <DonutSummaryCard
                    title="Pengeluaran"
                    subtitleLabel="Total pengeluaran"
                    total={pengeluaranBreakdown.total}
                    persen={pengeluaranBreakdown.persen}
                    data={pengeluaranBreakdown.data}
                />

                <DonutSummaryCard
                    title="Pemasukan"
                    subtitleLabel="Total pemasukan"
                    total={pemasukanBreakdown.total}
                    persen={pemasukanBreakdown.persen}
                    data={pemasukanBreakdown.data}
                />
            </div>

            {/* Card Tabel */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar: Search, date range, filter, export */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
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
                            25/12/2025 - 25/12/2026
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
                        onClick={handleExportPDF}
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 px-4 text-sm gap-1.5"
                    >
                        <FileDown className="h-4 w-4" />
                        Export PDF
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
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Jurusan</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Jenis Transaksi</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Kategori</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Deskripsi</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 text-center whitespace-nowrap">Qty</TableHead>
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
                                    <TableCell colSpan={14} className="text-center py-12 text-gray-400">
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
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.jurusan}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.jenisTransaksi}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.kategori}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.deskripsi}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 text-center whitespace-nowrap">{item.qty}</TableCell>
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
                                            <div className="flex items-center justify-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setDetailItem(item)}>
                                                            Lihat detail
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>Cetak invoice</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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

            {/* ── Dialog Detail Transaksi ── */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0">
                        <DialogTitle className="text-sm font-semibold">Detail Transaksi</DialogTitle>
                    </DialogHeader>

                    {detailItem && (
                        <div className="px-5 py-4 overflow-y-auto">
                            {/* Header ringkas: No invoice + jenis transaksi */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] text-gray-400">No. Invoice</p>
                                    <p className="text-sm font-semibold text-gray-700">{detailItem.noInvoice}</p>
                                </div>
                                <JenisTransaksiBadge jenis={detailItem.jenisTransaksi} />
                            </div>

                            <Separator className="my-2.5" />

                            <div className="divide-y divide-gray-50">
                                <DetailRow label="Tanggal" value={detailItem.tanggal} />
                                <DetailRow label="Kode Transaksi" value={detailItem.kodeTransaksi} />
                                <DetailRow label="Pembeli/Pemasok" value={detailItem.pembeliPemasok} />
                                <DetailRow label="Jurusan" value={detailItem.jurusan} />
                                <DetailRow label="Kategori" value={detailItem.kategori} />
                                <DetailRow label="Deskripsi" value={detailItem.deskripsi} />
                                <DetailRow label="Qty" value={detailItem.qty} />
                                <DetailRow
                                    label="Harga Satuan"
                                    value={detailItem.hargaSatuan ? `Rp ${formatRupiah(detailItem.hargaSatuan)}` : "-"}
                                />
                                <DetailRow label="Metode Pembayaran" value={detailItem.metodePembayaran} />
                                <DetailRow
                                    label="Status Settlement"
                                    value={<StatusSettlementBadge status={detailItem.statusSettlement} />}
                                />
                            </div>

                            <Separator className="my-2.5" />

                            {/* Total ditonjolkan */}
                            <div className="flex items-center justify-between bg-sky-50/60 border border-sky-100 rounded-lg px-3.5 py-2.5">
                                <span className="text-sm font-medium text-gray-600">Total</span>
                                <span className="text-sm font-bold text-gray-800">
                                    Rp {formatRupiah(detailItem.total)}
                                </span>
                            </div>

                            <div className="flex justify-end pt-3">
                                <Button
                                    onClick={handleCetakInvoice}
                                    className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-8 px-4 text-xs gap-1.5"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    Cetak Invoice
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}