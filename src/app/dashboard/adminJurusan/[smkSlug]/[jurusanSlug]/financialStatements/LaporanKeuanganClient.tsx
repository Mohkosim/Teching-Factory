"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { tampilkanLoading, confirmHapus } from "@/lib/utils/alert";
import {
    Search,
    Plus,
    Eye,
    Pencil,
    Trash2,
    Download,
    Wallet,
    Bell,
    Calendar as CalendarIcon,
    ImagePlus,
    X,
    Clock,
    Loader2,
    CheckCircle2,
    XCircle,
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
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import type { TransaksiRow } from "@/lib/data/laporan-keuangan";
import { formatRupiah, formatNominalInput } from "@/lib/utils/format";
import { parseTanggalToDate, formatDateRangeLabel, toDateInputValue } from "@/lib/utils/tanggal";

type PenarikanStatus = "Pending" | "Diproses" | "Selesai" | "Ditolak";
type StatusSettlement = "Settled" | "Pending" | "Refund";

function StatusSettlementBadge({ status }: { status: StatusSettlement }) {
    const styles: Record<StatusSettlement, string> = {
        Settled: "bg-emerald-100 text-emerald-600",
        Pending: "bg-amber-100 text-amber-600",
        Refund: "bg-rose-100 text-rose-600", 
    };
    return (
        <span
            className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-medium ${styles[status]}`}
        >
            {status}
        </span>
    );
}

// ── Alert status penarikan saldo (info dari SuperAdmin sudah ditransfer atau belum) ──
const PENARIKAN_STATUS_CONFIG: Record<
    PenarikanStatus,
    { icon: typeof Clock; bg: string; border: string; text: string; label: string; spin?: boolean }
> = {
    Pending: {
        icon: Clock,
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        label: "Menunggu diproses SuperAdmin",
    },
    Diproses: {
        icon: Loader2,
        bg: "bg-sky-50",
        border: "border-sky-200",
        text: "text-sky-700",
        label: "Sedang diproses SuperAdmin",
        spin: true,
    },
    Selesai: {
        icon: CheckCircle2,
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        label: "Saldo sudah ditransfer",
    },
    Ditolak: {
        icon: XCircle,
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        label: "Penarikan ditolak",
    },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="font-medium text-gray-700">{value}</span>
        </div>
    );
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="py-1.5 text-sm">
            <span className="text-gray-400 block mb-0.5">{label}</span>
            <span className="font-medium text-gray-700 leading-relaxed">{value}</span>
        </div>
    );
}

interface PenarikanItem {
    id: string;
    status: PenarikanStatus;
    nominal: number;
    tanggal: string;
    namaBank?: string;
    nomorRekening?: string;
    atasNama?: string;
}

interface LaporanKeuanganClientProps {
    initialTransaksi: TransaksiRow[];
    ringkasan: {
        totalPemasukan: number;
        totalPengeluaran: number;
        hpp: number;
        totalBiayaMidtrans: number;
    };
    saldo: {
        saldoTersedia: number;
        totalPemasukan: number;
        totalPengeluaran: number;
        totalPenarikan: number;
        totalBiayaMidtrans: number;
    };
    penarikanList?: PenarikanItem[];
}

export default function LaporanKeuanganClient({
    initialTransaksi,
    ringkasan,
    saldo,
    penarikanList,
}: LaporanKeuanganClientProps) {
    const router = useRouter();
    const transaksiData = initialTransaksi;

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [kategoriFilter, setKategoriFilter] = useState<string>("semua");

    const [detailItem, setDetailItem] = useState<TransaksiRow | null>(null);
    const [openHistory, setOpenHistory] = useState(false);

    // ── Dialog Form Pengeluaran (dipakai untuk Tambah maupun Edit) ──
    const [openFormPengeluaran, setOpenFormPengeluaran] = useState(false);
    const [formGambarPreview, setFormGambarPreview] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formNama, setFormNama] = useState("");
    const [formKategori, setFormKategori] = useState("Operasional");
    const [formDeskripsi, setFormDeskripsi] = useState("");
    const [formGambar, setFormGambar] = useState<File | null>(null);
    const [formGambarExisting, setFormGambarExisting] = useState<string | undefined>(undefined);
    const [formTanggal, setFormTanggal] = useState("");
    const tanggalInputRef = useRef<HTMLInputElement>(null);
    const [formNominal, setFormNominal] = useState("");
    const [formMetodePembayaran, setFormMetodePembayaran] = useState("Tunai");
    const [formStatusSettlement, setFormStatusSettlement] = useState("Selesai");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Dialog Tarik Saldo ──
    const [openTarikSaldo, setOpenTarikSaldo] = useState(false);
    const [formNominalTarik, setFormNominalTarik] = useState("");
    const [formNamaBank, setFormNamaBank] = useState("");
    const [formNomorRekening, setFormNomorRekening] = useState("");
    const [formAtasNama, setFormAtasNama] = useState("");
    const [detailPenarikan, setDetailPenarikan] = useState<PenarikanItem | null>(null);
    const [openPenarikanHistory, setOpenPenarikanHistory] = useState(false);

    // ── Perhitungan Laba ──
    const totalPemasukan = ringkasan.totalPemasukan;
    const hpp = ringkasan.hpp;                                  
    const labaKotor = totalPemasukan - hpp;                    
    const totalBiayaMidtrans = ringkasan.totalBiayaMidtrans;     
    const totalPengeluaranOps = ringkasan.totalPengeluaran - hpp;   
    const labaBersih = labaKotor - totalPengeluaranOps - totalBiayaMidtrans;

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [openDateFilter, setOpenDateFilter] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const filtered = useMemo(() => {
        return transaksiData.filter((item) => {
            const matchSearch =
                item.noInvoice.toLowerCase().includes(search.toLowerCase()) ||
                item.pembeliPemasok.toLowerCase().includes(search.toLowerCase()) ||
                item.deskripsi.toLowerCase().includes(search.toLowerCase());
            const matchKategori =
                kategoriFilter === "semua" ||
                item.jenisTransaksi.toLowerCase() === kategoriFilter;

            let matchDate = true;
            if (dateFrom || dateTo) {
                const itemDate = parseTanggalToDate(item.tanggal);
                if (itemDate) {
                    if (dateFrom && itemDate < new Date(dateFrom)) matchDate = false;
                    if (dateTo && itemDate > new Date(dateTo)) matchDate = false;
                }
            }

            return matchSearch && matchKategori && matchDate;
        });
    }, [transaksiData, search, kategoriFilter, dateFrom, dateTo]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const openDetail = (item: TransaksiRow) => setDetailItem(item);

    const METODE_TRANSFER_BANK = [
        "BCA",
        "BRI",
        "BNI",
        "Mandiri",
        "BSI",
        "BTN",
        "CIMB Niaga",
        "Danamon",
        "Permata Bank",
        "OCBC NISP",
        "Bank Jago",
        "SeaBank",
        "Bank Mega",
        "Maybank",
        "Bank DKI",
        "Bank Jatim",
        "Bank Jabar Banten (BJB)",
    ] as const;

    const METODE_EWALLET = [
        "GoPay",
        "OVO",
        "DANA",
        "ShopeePay",
        "LinkAja",
    ] as const;
    const resetFormPengeluaran = () => {
        setEditingId(null);
        setFormNama("");
        setFormKategori("Operasional");
        setFormDeskripsi("");
        setFormGambar(null);
        setFormGambarExisting(undefined);
        setFormGambarPreview(null);
        setFormTanggal("");
        setFormNominal("");
        setFormMetodePembayaran("Tunai");
        setFormStatusSettlement("Selesai");
    };

    const openTambahForm = () => {
        resetFormPengeluaran();
        setOpenFormPengeluaran(true);
    };

    const openEditForm = (item: TransaksiRow) => {
        if (item.jenisTransaksi !== "Pengeluaran" || !item.transaksiId) return;
        setEditingId(item.transaksiId);
        setFormNama(item.pembeliPemasok);
        setFormKategori(item.kategori);
        setFormDeskripsi(item.deskripsi);
        setFormTanggal(toDateInputValue(item.tanggal));
        setFormNominal(String(item.total ?? ""));
        setFormMetodePembayaran(item.metodePembayaran);
        setFormStatusSettlement(item.statusSettlement === "Settled" ? "Selesai" : "Menunggu");
        setFormGambar(null);
        setFormGambarExisting(item.gambarUrl);
        setOpenFormPengeluaran(true);
    };

    const openDeleteConfirm = async (item: TransaksiRow) => {
        const confirmed = await confirmHapus(item.pembeliPemasok || item.noInvoice);
        if (!confirmed) return;
        handleConfirmDelete(item);
    };

    const handleConfirmDelete = async (target: TransaksiRow) => {
        if (!target?.transaksiId) return;
        tampilkanLoading();
        try {
            const res = await fetch(`/api/laporan-keuangan/${target.transaksiId}`, {
                method: "DELETE",
            });
            Swal.close();
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.message || "Gagal menghapus transaksi");
                return;
            }
            toast.success("Transaksi berhasil dihapus");
            router.refresh();
        } catch {
            Swal.close();
            toast.error("Terjadi kesalahan, coba lagi");
        }
    };

    const handleSubmitPengeluaran = async () => {
        if (!formNominal || Number(formNominal) <= 0) {
            toast.error("Nominal pengeluaran harus diisi");
            return;
        }

        const fd = new FormData();
        fd.append("nama", formNama);
        fd.append("kategori", formKategori);
        fd.append("deskripsi", formDeskripsi);
        fd.append("tanggal", formTanggal);
        fd.append("nominal", formNominal);
        fd.append("metode", formMetodePembayaran);
        fd.append("status_settlement", formStatusSettlement);
        if (formGambar) fd.append("gambar", formGambar);

        tampilkanLoading();
        try {
            const url = editingId
                ? `/api/laporan-keuangan/${editingId}`
                : "/api/laporan-keuangan/pengeluaran";
            const res = await fetch(url, {
                method: editingId ? "PUT" : "POST",
                body: fd,
            });
            Swal.close();
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.message || "Gagal menyimpan pengeluaran");
                return;
            }
            toast.success(
                editingId ? "Transaksi berhasil diperbarui" : "Pengeluaran berhasil ditambahkan"
            );
            resetFormPengeluaran();
            setOpenFormPengeluaran(false);
            router.refresh();
        } catch {
            Swal.close();
            toast.error("Terjadi kesalahan, coba lagi");
        }
    };

    const handleTarikSaldo = () => setOpenTarikSaldo(true);

    const handleSubmitTarikSaldo = async () => {
        const nominal = Number(formNominalTarik);
        if (!nominal || nominal <= 0) {
            toast.error("Nominal harus diisi");
            return;
        }
        if (nominal > saldo.saldoTersedia) {
            toast.error("Nominal melebihi saldo yang tersedia");
            return;
        }
        if (!formNamaBank || !formNomorRekening || !formAtasNama) {
            toast.error("Data rekening tujuan belum lengkap");
            return;
        }

        tampilkanLoading();
        try {
            const res = await fetch("/api/laporan-keuangan/tarik-saldo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nominal,
                    nama_bank: formNamaBank,
                    nomor_rekening: formNomorRekening,
                    atas_nama: formAtasNama,
                }),
            });
            Swal.close();
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.message || "Gagal mengajukan penarikan saldo");
                return;
            }
            toast.success("Pengajuan tarik saldo berhasil dikirim");
            setOpenTarikSaldo(false);
            setFormNominalTarik("");
            setFormNamaBank("");
            setFormNomorRekening("");
            setFormAtasNama("");
            router.refresh();
        } catch {
            Swal.close();
            toast.error("Terjadi kesalahan, coba lagi");
        }
    };

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    const handleIncomingFile = (file: File) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            toast.error("Format gambar harus JPEG, PNG, atau WEBP");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error("Ukuran gambar maksimal 2MB");
            return;
        }
        setFormGambar(file);
        setFormGambarPreview(URL.createObjectURL(file));
        setFormGambarExisting(undefined);
    };

    const removeFormGambar = () => {
        setFormGambar(null);
        setFormGambarPreview(null);
        setFormGambarExisting(undefined);
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

            {/* Card Saldo yang Diterima */}
            <div className="bg-linear-to-r from-sky-500 to-sky-400 rounded-2xl shadow-sm p-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-sky-50">Saldo yang Diterima</p>
                        <p className="text-2xl font-bold">{formatRupiah(saldo.saldoTersedia)}</p>
                        {saldo.totalBiayaMidtrans > 0 && (
                            <p className="text-xs text-sky-50/80 mt-0.5">
                                Sudah dipotong estimasi biaya Midtrans {formatRupiah(saldo.totalBiayaMidtrans)}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {penarikanList && penarikanList.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setOpenPenarikanHistory(true)}
                            className="relative h-10 w-10 flex items-center justify-center rounded-full bg-white hover:bg-white/90 border border-white/40 text-sky-600 transition-colors"
                            title="Riwayat Penarikan Saldo"
                        >
                            <Bell className="h-4 w-4" />
                            <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full border border-white bg-sky-600 text-white text-[10px] font-bold">
                                {penarikanList.length}
                            </span>
                        </button>
                    )}
                    <Button
                        onClick={handleTarikSaldo}
                        disabled={saldo.saldoTersedia <= 0}
                        className="bg-white hover:bg-sky-50 text-sky-600 rounded-full h-10 px-5 text-sm gap-1.5 disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />
                        Tarik Saldo
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        {totalBiayaMidtrans > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Biaya Midtrans (estimasi)
                                </span>
                                <span>- {formatRupiah(totalBiayaMidtrans)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                            <span>Laba Bersih</span>
                            <span className="text-sky-600">{formatRupiah(labaBersih)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Card Tabel */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                    {/* Kiri: hanya search */}
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

                    {/* Kanan: filter tanggal, kategori, tombol Tambah */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpenDateFilter((o) => !o)}
                                className="h-9 text-sm font-normal text-gray-500 bg-gray-50 border-gray-200 rounded-lg gap-1.5"
                            >
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {formatDateRangeLabel(dateFrom, dateTo)}
                            </Button>

                            {openDateFilter && (
                                <>
                                    {/* klik di luar untuk nutup */}
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setOpenDateFilter(false)}
                                    />
                                    <div className="absolute right-0 mt-2 z-20 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">Dari Tanggal</label>
                                            <Input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                                className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">Sampai Tanggal</label>
                                            <Input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDateFrom("");
                                                    setDateTo("");
                                                    setPage(1);
                                                }}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Reset
                                            </button>
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setPage(1);
                                                    setOpenDateFilter(false);
                                                }}
                                                className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-8 px-4 text-xs"
                                            >
                                                Terapkan
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

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

                        <Button
                            onClick={openTambahForm}
                            className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 px-4 text-sm gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Pengeluaran
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">No. Invoice</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Tanggal</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Pembeli/Pemasok</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Jenis Transaksi</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Kategori</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Barang/Jasa</TableHead>
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
                                    <TableCell colSpan={11} className="text-center py-12 text-gray-400">
                                        Tidak ada data ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((item) => (
                                    <TableRow key={item.id} className="h-16 hover:bg-blue-50/30 transition-colors">
                                        <TableCell className="text-gray-500 py-4 px-6 whitespace-nowrap">{item.noInvoice}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.tanggal}</TableCell>
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
                                                {item.jenisTransaksi === "Pengeluaran" && (
                                                    <>
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
                                                    </>
                                                )}
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

            {/* ══════════════ Dialog: Form Pengeluaran (Tambah / Edit) ══════════════ */}
            <Dialog
                open={openFormPengeluaran}
                onOpenChange={(open) => {
                    setOpenFormPengeluaran(open);
                    if (!open) resetFormPengeluaran();
                }}
            >
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0">
                        <DialogTitle className="text-sm font-semibold">
                            {editingId ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="px-5 py-4 space-y-4 overflow-y-auto">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Nama Pemasok
                            </label>
                            <Input
                                placeholder="Masukkan Nama Pemasok"
                                value={formNama}
                                onChange={(e) => setFormNama(e.target.value)}
                                className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Keterangan
                            </label>
                            <Select value={formKategori} onValueChange={setFormKategori}>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Metode Pembayaran
                                </label>
                                <Select value={formMetodePembayaran} onValueChange={setFormMetodePembayaran}>
                                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Tunai">Tunai</SelectItem>
                                        <SelectItem value="Transfer">Transfer</SelectItem>
                                        <SelectItem value="QRIS">QRIS</SelectItem>
                                        <SelectItem value="E_Wallet">E-Wallet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Status Settlement
                                </label>
                                <Select value={formStatusSettlement} onValueChange={setFormStatusSettlement}>
                                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Selesai">Selesai</SelectItem>
                                        <SelectItem value="Menunggu">Menunggu</SelectItem>
                                        <SelectItem value="Gagal">Gagal</SelectItem>
                                        <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                                        <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Foto Bukti (maks 2MB)
                            </label>
                            <div
                                className="flex flex-wrap gap-2"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleIncomingFile(file);
                                }}
                            >
                                {(formGambarPreview || formGambarExisting) ? (
                                    <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-sky-200 group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={formGambarPreview ?? formGambarExisting}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeFormGambar}
                                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-sky-400 hover:text-sky-500 transition-colors"
                                    >
                                        <ImagePlus className="h-5 w-5" />
                                        <span className="text-[10px] mt-1">Tambah</span>
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleIncomingFile(file);
                                    e.target.value = "";
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Tanggal Pengeluaran
                                </label>
                                <div className="relative">
                                    <Input
                                        ref={tanggalInputRef}
                                        type="date"
                                        value={formTanggal}
                                        onChange={(e) => setFormTanggal(e.target.value)}
                                        className="bg-gray-50 border-gray-200 rounded-lg text-sm pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => tanggalInputRef.current?.showPicker?.()}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-500 transition-colors"
                                    >
                                        <CalendarIcon className="h-4 w-4" />
                                    </button>
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
                                        placeholder="Masukan Nominal"
                                        value={formatNominalInput(formNominal)}
                                        onChange={(e) => setFormNominal(e.target.value.replace(/\D/g, ""))}
                                        inputMode="numeric"
                                        className="bg-gray-50 border-gray-200 rounded-lg text-sm pl-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleSubmitPengeluaran}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full h-10 text-sm mt-2"
                        >
                            {editingId ? "Simpan Perubahan" : "Simpan"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ══════════════ Dialog: Detail Pesanan / Detail Pengeluaran ══════════════ */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0 flex-row items-center justify-between">
                        <DialogTitle className="text-sm font-semibold">
                            {detailItem?.jenisTransaksi === "Pengeluaran" ? "Detail Pengeluaran" : "Detail Pesanan"}
                        </DialogTitle>
                        {/* {detailItem?.jenisTransaksi === "Pengeluaran" && (
                            <button
                                onClick={() => setOpenHistory(true)}
                                className="h-7 w-7 mr-6 flex items-center justify-center rounded-full bg-sky-500 hover:bg-sky-600 text-white transition-colors"
                                title="Lihat History"
                            >
                                <Bell className="h-3.5 w-3.5" />
                            </button>
                        )} */}
                    </DialogHeader>

                    {detailItem && detailItem.jenisTransaksi === "Pemasukan" && (
                        <div className="px-5 py-4 overflow-y-auto text-sm">
                            <p className="text-gray-600">
                                No. invoice : <span className="font-medium text-gray-800">{detailItem.noInvoice}</span>
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
                                    <p className="text-xs text-gray-500">Harga : {formatRupiah(detailItem.hargaSatuan)}</p>
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <InfoRow label="Metode Pembayaran" value={detailItem.metodePembayaran} />
                                <InfoRow label="Sub Total" value={`${formatRupiah(detailItem.hargaSatuan)}`} />
                                <InfoRow label="Biaya Ongkir" value={`${formatRupiah(detailItem.biayaOngkir ?? 0)}`} />
                                <InfoRow label="Total" value={`${formatRupiah(detailItem.total)}`} />
                                {(detailItem.biayaMidtrans ?? 0) > 0 && (
                                    <InfoRow
                                        label="Estimasi Biaya Midtrans"
                                        value={
                                            <span className="text-red-500">
                                                - {formatRupiah(detailItem.biayaMidtrans!)}
                                            </span>
                                        }
                                    />
                                )}
                            </div>

                            {detailItem.pembeli && (
                                <>
                                    <Separator className="my-3" />
                                    <p className="font-semibold text-gray-800 mb-1">Detail Pembeli</p>
                                    <InfoRow label="Nama" value={detailItem.pembeli.nama} />
                                    <InfoRow label="Nomor" value={detailItem.pembeli.nomor} />
                                    <InfoRow label="E-mail" value={detailItem.pembeli.email} />
                                    <InfoBlock label="Alamat" value={detailItem.pembeli.alamat} />
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

                            {detailItem.refund && (  
                                <>
                                    <Separator className="my-3" />
                                    <p className="font-semibold text-gray-800 mb-1">Detail Refund</p>
                                    <InfoRow label="Status" value={detailItem.refund.status} />
                                    <InfoBlock label="Alasan" value={detailItem.refund.alasan} />
                                </>
                            )}
                        </div>
                    )}

                    {detailItem && detailItem.jenisTransaksi === "Pengeluaran" && (
                        <div className="px-5 py-4 overflow-y-auto text-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div
                                        className="h-14 w-14 rounded-lg overflow-hidden bg-gray-100 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => detailItem.gambarUrl && setPreviewImage(detailItem.gambarUrl)}
                                    >
                                        {detailItem.gambarUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={detailItem.gambarUrl} alt={detailItem.pembeliPemasok} className="h-full w-full object-cover" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{detailItem.pembeliPemasok || "Pembelian barang"}</p>
                                        <p className="text-xs text-gray-500">No. Invoice : {detailItem.noInvoice || "-"}</p>
                                        <p className="text-xs text-gray-500">Tanggal : {detailItem.tanggal}</p>
                                    </div>
                                </div>
                                <StatusSettlementBadge status={detailItem.statusSettlement} />
                            </div>

                            <Separator className="my-3" />

                            <div className="space-y-1">
                                <InfoRow label="Keterangan" value={detailItem.kategori} />
                                <InfoRow label="Total" value={`${formatRupiah(detailItem.total)}`} />
                                <InfoRow label="Metode Pembayaran" value={detailItem.metodePembayaran} />
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

            {/* ══════════════ Dialog: Tarik Saldo ══════════════ */}
            <Dialog open={openTarikSaldo} onOpenChange={setOpenTarikSaldo}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60">
                        <DialogTitle className="text-sm font-semibold">Tarik Saldo</DialogTitle>
                    </DialogHeader>

                    <div className="px-5 py-4 space-y-4">
                        <p className="text-sm text-gray-500">
                            Saldo tersedia:{" "}
                            <span className="font-semibold text-sky-600">
                                {formatRupiah(saldo.saldoTersedia)}
                            </span>
                        </p>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Nominal Penarikan</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                                <Input
                                    value={formatNominalInput(formNominalTarik)}
                                    onChange={(e) => setFormNominalTarik(e.target.value.replace(/\D/g, ""))}
                                    inputMode="numeric"
                                    placeholder="Masukkan nominal"
                                    className="bg-gray-50 border-gray-200 rounded-lg text-sm pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Metode Penarikan</label>
                            <Select value={formNamaBank} onValueChange={setFormNamaBank}>
                                <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg text-sm">
                                    <SelectValue placeholder="Pilih bank / e-wallet" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Transfer Bank</SelectLabel>
                                        {METODE_TRANSFER_BANK.map((bank) => (
                                            <SelectItem key={bank} value={bank}>
                                                {bank}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                    <SelectGroup>
                                        <SelectLabel>E-Wallet</SelectLabel>
                                        {METODE_EWALLET.map((ewallet) => (
                                            <SelectItem key={ewallet} value={ewallet}>
                                                {ewallet}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Nomor Rekening/HP</label>
                                <Input
                                    value={formNomorRekening}
                                    onChange={(e) => setFormNomorRekening(e.target.value.replace(/\D/g, ""))}
                                    inputMode="numeric"
                                    placeholder="Masukkan nomor rekening atau HP"
                                    className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Atas Nama</label>
                                <Input
                                    value={formAtasNama}
                                    onChange={(e) => setFormAtasNama(e.target.value)}
                                    className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleSubmitTarikSaldo}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full h-10 text-sm mt-2"
                        >
                            Ajukan Penarikan
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ══════════════ Dialog: Riwayat Penarikan Saldo ══════════════ */}
            <Dialog open={openPenarikanHistory} onOpenChange={setOpenPenarikanHistory}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0">
                        <DialogTitle className="text-sm font-semibold">Riwayat Penarikan Saldo</DialogTitle>
                    </DialogHeader>

                    <div className="px-5 py-4 overflow-y-auto space-y-2">
                        {(!penarikanList || penarikanList.length === 0) && (
                            <p className="text-xs text-gray-400 text-center py-6">Belum ada riwayat penarikan</p>
                        )}
                        {penarikanList?.map((item) => {
                            const cfg = PENARIKAN_STATUS_CONFIG[item.status];
                            const Icon = cfg.icon;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setOpenPenarikanHistory(false);
                                        setDetailPenarikan(item);
                                    }}
                                    className={`w-full flex items-center gap-3 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3 text-left transition-colors hover:brightness-95`}
                                >
                                    <Icon className={`h-5 w-5 shrink-0 ${cfg.text} ${cfg.spin ? "animate-spin" : ""}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {formatRupiah(item.nominal)} · Diajukan {item.tanggal}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-medium ${cfg.text} shrink-0`}>Lihat</span>
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ══════════════ Dialog: Detail Status Penarikan Saldo ══════════════ */}
            <Dialog open={!!detailPenarikan} onOpenChange={(open) => !open && setDetailPenarikan(null)}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60">
                        <DialogTitle className="text-sm font-semibold">Detail Penarikan Saldo</DialogTitle>
                    </DialogHeader>

                    {detailPenarikan && (() => {
                        const cfg = PENARIKAN_STATUS_CONFIG[detailPenarikan.status];
                        const Icon = cfg.icon;
                        return (
                            <div className="px-5 py-4 space-y-4 text-sm">
                                <div className="text-center py-2">
                                    <p className="text-2xl font-bold text-gray-800">
                                        {formatRupiah(detailPenarikan.nominal)}
                                    </p>
                                    <span className={`inline-flex items-center gap-1.5 mt-2 rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                        <Icon className={`h-3.5 w-3.5 ${cfg.spin ? "animate-spin" : ""}`} />
                                        {detailPenarikan.status}
                                    </span>
                                </div>

                                <Separator />

                                <div className="space-y-1">
                                    <InfoRow label="Tanggal Pengajuan" value={detailPenarikan.tanggal} />
                                    <InfoRow label="Status" value={cfg.label} />
                                </div>

                                {(detailPenarikan.namaBank || detailPenarikan.nomorRekening) && (
                                    <>
                                        <Separator />
                                        <div>
                                            <p className="font-semibold text-gray-800 mb-2">Rekening Tujuan</p>
                                            <div className="bg-sky-50/60 border border-sky-100 rounded-lg p-3 space-y-1">
                                                <InfoRow label="Bank / E-Wallet" value={detailPenarikan.namaBank ?? "-"} />
                                                <InfoRow label="No. Rekening/HP" value={detailPenarikan.nomorRekening ?? "-"} />
                                                <InfoRow label="Atas Nama" value={detailPenarikan.atasNama ?? "-"} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>


            {/* ══════════════ Dialog: Preview Gambar Full ══════════════ */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-black/90 border-0">
                    <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    {previewImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="w-full max-h-[85vh] object-contain"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}