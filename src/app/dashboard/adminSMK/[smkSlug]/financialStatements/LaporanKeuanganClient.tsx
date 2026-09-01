"use client";

import { useState, useMemo } from "react";
import { Search, FileDown, Eye } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PaginationIconsOnly from "@/components/pagination/page";
import { exportLaporanKeuanganExcel } from "@/lib/utils/export-laporan-keuangan";

type JenisTransaksi = "Pemasukan" | "Pengeluaran";
type StatusSettlement = "Settled" | "Pending";

interface TransaksiItem {
    id: string;
    noInvoice: string;
    tanggal: string;
    kodeTransaksi: string;
    pembeliPemasok: string;
    jurusan: string;
    jenisTransaksi: JenisTransaksi;
    kategori: string;
    deskripsi: string;
    hargaSatuan: number;
    total: number;
    metodePembayaran: string;
    statusSettlement: StatusSettlement;
}

interface Breakdown {
    total: number;
    persen: number;
    persenLabel?: string;
    data: { name: string; value: number; color: string }[];
}

interface LaporanKeuanganClientProps {
    initialTransaksi: TransaksiItem[];
    ringkasan: {
        totalPemasukan: number;
        totalPengeluaran: number;
        totalHpp: number;          // ⬅️ baru
        labaKotor: number;          // ⬅️ baru
        totalBiayaMidtrans: number;
        labaBersih: number;
    };
    pengeluaranBreakdown: Breakdown;
    pemasukanBreakdown: Breakdown;
}

function formatRupiah(value: number) {
    return new Intl.NumberFormat("id-ID").format(value);
}

function DonutSummaryCard({
    title, subtitleLabel, total, persen, persenLabel, data,
}: {
    title: string;
    subtitleLabel: string;
    total: number;
    persen: number;
    persenLabel?: string;
    data: { name: string; value: number; color: string }[];
}) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1 min-w-24">
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-bold text-gray-700">{persen}%</span>
                        {persenLabel && (
                            <span className="text-[9px] text-gray-400 leading-tight">{persenLabel}</span>
                        )}
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

function StatusSettlementBadge({ status }: { status: StatusSettlement }) {
    const styles: Record<StatusSettlement, string> = {
        Settled: "bg-emerald-100 text-emerald-600",
        Pending: "bg-amber-100 text-amber-600",
    };
    return (
        <span className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-medium ${styles[status]}`}>
            {status}
        </span>
    );
}

function JenisTransaksiBadge({ jenis }: { jenis: JenisTransaksi }) {
    const styles: Record<JenisTransaksi, string> = {
        Pemasukan: "bg-sky-100 text-sky-600",
        Pengeluaran: "bg-red-100 text-red-500",
    };
    return (
        <span className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-medium ${styles[jenis]}`}>
            {jenis}
        </span>
    );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-2 gap-4 py-1.5">
            <span className="text-xs text-gray-400">{label}</span>
            <span className="text-sm font-medium text-gray-700 text-right">{value}</span>
        </div>
    );
}

export default function LaporanKeuanganClient({
    initialTransaksi,
    ringkasan,
    pengeluaranBreakdown,
    pemasukanBreakdown,
}: LaporanKeuanganClientProps) {
    const transaksiData = initialTransaksi;

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
    }, [transaksiData, search, kategoriFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Export laporan sebagai CSV (bisa dibuka Excel), dari seluruh data yang sedang ter-filter
    const handleExportExcel = async () => {
        await exportLaporanKeuanganExcel(ringkasan, filtered);
    };

    return (
        <div className="space-y-6 px-6">
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

            <div className="flex flex-wrap gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-[1.4] min-w-28">
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
                        <span className="text-sm text-gray-700">-{formatRupiah(ringkasan.totalPengeluaran)}</span>
                    </div>
                    {ringkasan.totalBiayaMidtrans > 0 && (
                        <div className="grid grid-cols-2 px-5 py-3 border-b border-gray-50">
                            <span className="text-sm text-gray-500">Biaya Admin (estimasi)</span>
                            <span className="text-sm text-gray-700">-{formatRupiah(ringkasan.totalBiayaMidtrans)}</span>
                        </div>
                    )}
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
                    persenLabel={pengeluaranBreakdown.persenLabel}
                    data={pengeluaranBreakdown.data}
                />

                <DonutSummaryCard
                    title="Pemasukan"
                    subtitleLabel="Total pemasukan"
                    total={pemasukanBreakdown.total}
                    persen={pemasukanBreakdown.persen}
                    persenLabel={pemasukanBreakdown.persenLabel}
                    data={pemasukanBreakdown.data}
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-20 max-w-sm">
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
                        onClick={handleExportExcel}
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 px-4 text-sm gap-1.5"
                    >
                        <FileDown className="h-4 w-4" />
                        Export Laporan
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">No. Invoice</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Tanggal</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Pembeli/Pemasok</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Jurusan</TableHead>
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
                                    <TableCell colSpan={14} className="text-center py-12 text-gray-400">
                                        Tidak ada data ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((item) => (
                                    <TableRow key={item.id} className="h-16 hover:bg-blue-50/30 transition-colors">
                                        <TableCell className="text-gray-500 py-4 px-6 whitespace-nowrap">{item.noInvoice}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.tanggal}</TableCell>
                                        <TableCell className="font-medium text-gray-700 py-4 px-6 whitespace-nowrap">{item.pembeliPemasok}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.jurusan}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.jenisTransaksi}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.kategori}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.deskripsi}</TableCell>
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
                                                <button
                                                    onClick={() => setDetailItem(item)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </div>

            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0">
                        <DialogTitle className="text-sm font-semibold">Detail Transaksi</DialogTitle>
                    </DialogHeader>

                    {detailItem && (
                        <div className="px-5 py-4 overflow-y-auto">
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
                                <DetailRow label="Pembeli/Pemasok" value={detailItem.pembeliPemasok} />
                                <DetailRow label="Jurusan" value={detailItem.jurusan} />
                                <DetailRow label="Kategori" value={detailItem.kategori} />
                                <DetailRow label="Deskripsi" value={detailItem.deskripsi} />
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

                            <div className="flex items-center justify-between bg-sky-50/60 border border-sky-100 rounded-lg px-3.5 py-2.5">
                                <span className="text-sm font-medium text-gray-600">Total</span>
                                <span className="text-sm font-bold text-gray-800">
                                    Rp {formatRupiah(detailItem.total)}
                                </span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}