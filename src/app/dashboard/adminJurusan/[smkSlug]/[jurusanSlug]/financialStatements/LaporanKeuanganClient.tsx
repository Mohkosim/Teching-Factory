"use client";

import { Fragment, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { tampilkanLoading } from "@/lib/utils/alert";
import {
    Search,
    Plus,
    Eye,
    Download,
    Wallet,
    Bell,
    X,
    Clock,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    BookOpen,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
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

import PaginationIconsOnly from "@/components/pagination/page";
import type { TransaksiRow } from "@/lib/data/laporan-keuangan";
import { AKUN, AKUN_MAP } from "@/lib/akuntansi/coa";
import {
    bukuBesar,
    neracaSaldo,
    saring,
    tanggalAwalPembukuan,
    validasiSistem,
    type Jurnal,
    type JenisJurnal,
    type NeracaSaldo,
} from "@/lib/akuntansi/engine";
import FormJurnalManual from "../akuntansi/FormJurnalManual";
import FormPengeluaran from "../akuntansi/FormPengeluaran";
import { AkunTab, ArusKasTab, LabaRugiTab, NeracaTab, PerubahanEkuitasTab, ValidasiTab } from "../akuntansi/LaporanTabs";
import { Kartu, Kepala, Lencana, Panel, Sel, rp, tanggalID } from "../akuntansi/ui";
import { formatRupiah, formatNominalInput } from "@/lib/utils/format";
import { toDateInputValue } from "@/lib/utils/tanggal";

type PenarikanStatus = "Pending" | "Diproses" | "Selesai" | "Ditolak";
type StatusSettlement = "Settled" | "Pending" | "Refund";

const TAB = [
    { id: "ringkasan", label: "Ringkasan & Transaksi" },
    { id: "jurnal-umum", label: "Jurnal Umum" },
    { id: "buku-besar", label: "Buku Besar" },
    { id: "neraca-saldo", label: "Neraca Saldo" },
    { id: "jurnal-penyesuaian", label: "Jurnal Penyesuaian" },
    { id: "neraca-saldo-disesuaikan", label: "Neraca Saldo Disesuaikan" },
    { id: "laba-rugi", label: "Laba Rugi" },
    { id: "perubahan-ekuitas", label: "Perubahan Ekuitas" },
    { id: "neraca", label: "Neraca" },
    { id: "arus-kas", label: "Arus Kas" },
    { id: "validasi", label: "Validasi" },
    { id: "akun", label: "Daftar Akun" },
] as const;
type TabId = (typeof TAB)[number]["id"];

const WARNA_JENIS: Record<JenisJurnal, string> = {
    Pembayaran: "bg-emerald-100 text-emerald-700",
    "Biaya Midtrans": "bg-orange-100 text-orange-700",
    "Pengakuan Pendapatan": "bg-purple-100 text-purple-700",
    Pengeluaran: "bg-red-100 text-red-700",
    Refund: "bg-rose-100 text-rose-700",
    "Penarikan Saldo": "bg-sky-100 text-sky-700",
    "Modal Awal": "bg-blue-100 text-blue-700",
    Penyesuaian: "bg-purple-100 text-purple-700",
    "Jurnal Umum": "bg-blue-100 text-blue-700",
};

const selectCls = "h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm";

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
    jurnal: Jurnal[];
    peringatan: string[];
    namaJurusan: string;
    hariIni: string;
    saldo: {
        saldoTersedia: number;
        totalBiayaMidtrans: number;
    };
    penarikanList?: PenarikanItem[];
}

export default function LaporanKeuanganClient({
    initialTransaksi,
    jurnal,
    peringatan,
    namaJurusan,
    hariIni,
    saldo,
    penarikanList,
}: LaporanKeuanganClientProps) {
    const router = useRouter();
    const transaksiData = initialTransaksi;

    const [tab, setTab] = useState<TabId>("ringkasan");

    const awal = useMemo(() => tanggalAwalPembukuan(jurnal) ?? `${hariIni.slice(0, 8)}01`, [jurnal, hariIni]);
    const [mulai, setMulai] = useState(awal);
    const [sampai, setSampai] = useState(hariIni);
    const periodeOk = mulai !== "" && sampai !== "" && mulai <= sampai;

    const status = useMemo(() => validasiSistem(jurnal, sampai), [jurnal, sampai]);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [kategoriFilter, setKategoriFilter] = useState<string>("semua");

    const [detailItem, setDetailItem] = useState<TransaksiRow | null>(null);
    const [openHistory, setOpenHistory] = useState(false);

    const [openTarikSaldo, setOpenTarikSaldo] = useState(false);
    const [formNominalTarik, setFormNominalTarik] = useState("");
    const [formNamaBank, setFormNamaBank] = useState("");
    const [formNomorRekening, setFormNomorRekening] = useState("");
    const [formAtasNama, setFormAtasNama] = useState("");
    const [detailPenarikan, setDetailPenarikan] = useState<PenarikanItem | null>(null);
    const [openPenarikanHistory, setOpenPenarikanHistory] = useState(false);

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
            const tgl = toDateInputValue(item.tanggal);
            if (tgl && periodeOk) matchDate = tgl >= mulai && tgl <= sampai;

            return matchSearch && matchKategori && matchDate;
        });
    }, [transaksiData, search, kategoriFilter, mulai, sampai, periodeOk]);

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

    return (
        <div className="space-y-6 px-6">
            <div className="flex flex-col gap-4 rounded-2xl bg-linear-to-r from-sky-500 to-sky-600 p-5 text-white md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-sky-50">Laporan Keuangan — {namaJurusan}</p>
                        <p className="text-xl font-bold">Ringkasan, Transaksi &amp; Siklus Akuntansi</p>
                        <p className="text-xs text-sky-50/80">
                            Jurnal otomatis dari penjualan, pengeluaran, refund, dan penarikan saldo
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="mb-1 block text-xs text-sky-50">Dari</label>
                        <Input
                            type="date"
                            value={mulai}
                            max={sampai}
                            onChange={(e) => setMulai(e.target.value)}
                            className="h-10 w-40 border-0 bg-white text-gray-800"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-sky-50">Sampai</label>
                        <Input
                            type="date"
                            value={sampai}
                            min={mulai}
                            onChange={(e) => setSampai(e.target.value)}
                            className="h-10 w-40 border-0 bg-white text-gray-800"
                        />
                    </div>
                    <button type="button" onClick={() => setTab("validasi")} title="Lihat detail validasi" className="pb-2.5">
                        <Lencana ok={status.valid} teksOk="SISTEM VALID" teksTidak="TIDAK VALID" />
                    </button>
                </div>
            </div>

            {!periodeOk && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    Tanggal “Dari” tidak boleh setelah tanggal “Sampai”.
                </p>
            )}

            {peringatan.length > 0 && (
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <ul className="list-disc space-y-1 pl-4">
                        {peringatan.map((p) => (
                            <li key={p}>{p}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Tab bar — 1 tab Ringkasan & Transaksi + 11 tab siklus akuntansi */}
            <div className="overflow-x-auto border-b border-gray-200">
                <div className="flex min-w-max gap-1">
                    {TAB.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${tab === t.id ? "border-sky-600 font-semibold text-sky-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === "ringkasan" ? (
                <>
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

                            {/* Kanan: filter kategori (periode sudah di header atas) */}
                            <div className="flex flex-wrap items-center gap-3">
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
                </>
            ) : jurnal.length === 0 && tab !== "akun" && tab !== "jurnal-penyesuaian" && tab !== "jurnal-umum" ? (
                <Panel>
                    <p className="text-sm text-gray-500">
                        Belum ada jurnal. Jurnal otomatis muncul setelah ada pembayaran pesanan atau pengeluaran;
                        jurnal manual bisa dibuat di tab Jurnal Umum.
                    </p>
                </Panel>
            ) : (
                <>
                    {tab === "jurnal-umum" && <TabJurnalUmum jurnal={jurnal} mulai={mulai} sampai={sampai} hariIni={hariIni} />}
                    {tab === "buku-besar" && <TabBukuBesar jurnal={jurnal} mulai={mulai} sampai={sampai} />}
                    {tab === "neraca-saldo" && (
                        <TabelNeracaSaldo
                            ns={neracaSaldo(jurnal, { sampai, tanpaPenyesuaian: true })}
                            judul="Neraca Saldo (Sebelum Penyesuaian)"
                            keterangan={`Saldo seluruh akun per ${tanggalID(sampai)} SEBELUM jurnal penyesuaian dimasukkan — untuk memastikan total debit = total kredit sebelum tahap penyesuaian.`}
                        />
                    )}
                    {tab === "jurnal-penyesuaian" && <TabPenyesuaian jurnal={jurnal} hariIni={hariIni} />}
                    {tab === "neraca-saldo-disesuaikan" && (
                        <TabelNeracaSaldo
                            ns={neracaSaldo(jurnal, { sampai })}
                            judul="Neraca Saldo Disesuaikan"
                            keterangan={`Saldo per ${tanggalID(sampai)} SETELAH jurnal penyesuaian — inilah dasar penyusunan laporan keuangan.`}
                        />
                    )}
                    {tab === "laba-rugi" && periodeOk && <LabaRugiTab jurnal={jurnal} mulai={mulai} sampai={sampai} />}
                    {tab === "perubahan-ekuitas" && periodeOk && <PerubahanEkuitasTab jurnal={jurnal} mulai={mulai} sampai={sampai} />}
                    {tab === "neraca" && <NeracaTab jurnal={jurnal} sampai={sampai} />}
                    {tab === "arus-kas" && periodeOk && <ArusKasTab jurnal={jurnal} mulai={mulai} sampai={sampai} />}
                    {tab === "validasi" && <ValidasiTab jurnal={jurnal} sampai={sampai} />}
                    {tab === "akun" && <AkunTab />}
                </>
            )}

            {/* ══════════════ Dialog: Detail Pesanan / Detail Pengeluaran ══════════════ */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0 flex-row items-center justify-between">
                        <DialogTitle className="text-sm font-semibold">
                            {detailItem && !detailItem.asalPesanan ? "Detail Pengeluaran" : "Detail Pesanan"}
                        </DialogTitle>
                    </DialogHeader>

                    {detailItem && detailItem.asalPesanan && (
                        <div className="px-5 py-4 overflow-y-auto text-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-gray-600">
                                        No. invoice : <span className="font-medium text-gray-800">{detailItem.noInvoice}</span>
                                    </p>
                                    <p className="text-gray-600">
                                        Tanggal : <span className="font-medium text-gray-800">{detailItem.tanggal}</span>
                                    </p>
                                </div>
                                <StatusSettlementBadge status={detailItem.statusSettlement} />
                            </div>

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
                                    {detailItem.varianLabel && (
                                        <p className="text-xs text-gray-500">Varian : {detailItem.varianLabel}</p>
                                    )}
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

                    {detailItem && !detailItem.asalPesanan && (
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

// ── Tab 1. Jurnal Umum ──────────────────────────────────────────────────────
function TabJurnalUmum({ jurnal, mulai, sampai, hariIni }: { jurnal: Jurnal[]; mulai: string; sampai: string; hariIni: string }) {
    const [jenis, setJenis] = useState<"semua" | JenisJurnal>("semua");
    const [cari, setCari] = useState("");
    const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
    const [halaman, setHalaman] = useState(1);
    const [ukuranHalaman, setUkuranHalaman] = useState(10);
    const [formTerbuka, setFormTerbuka] = useState(false);
    const [formPengeluaranTerbuka, setFormPengeluaranTerbuka] = useState(false);

    const daftar = useMemo(() => {
        const q = cari.toLowerCase();
        return saring(jurnal, { mulai, sampai })
            .filter((j) => (jenis === "semua" || j.jenis === jenis) && (!q || j.kode.toLowerCase().includes(q) || j.keterangan.toLowerCase().includes(q) || (j.sumber ?? "").toLowerCase().includes(q)))
            .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.waktu - a.waktu);
    }, [jurnal, mulai, sampai, jenis, cari]);

    const totalHalaman = Math.max(1, Math.ceil(daftar.length / ukuranHalaman));
    const halamanAktif = Math.min(halaman, totalHalaman);
    const daftarHalaman = daftar.slice((halamanAktif - 1) * ukuranHalaman, halamanAktif * ukuranHalaman);

    function toggle(id: string) {
        const s = new Set(terbuka);
        if (s.has(id)) s.delete(id);
        else s.add(id);
        setTerbuka(s);
    }

    const jenisAda = Array.from(new Set(jurnal.map((j) => j.jenis)));
    const totalDebit = daftar.reduce((s, j) => s + j.baris.reduce((x, b) => x + b.debit, 0), 0);
    const totalKredit = daftar.reduce((s, j) => s + j.baris.reduce((x, b) => x + b.kredit, 0), 0);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kartu label="Jumlah Jurnal" nilai={String(daftar.length)} />
                <Kartu label="Total Debit" nilai={rp(totalDebit)} />
                <Kartu label="Total Kredit" nilai={rp(totalKredit)} />
                <Kartu label="Selisih" nilai={rp(totalDebit - totalKredit)} ok={totalDebit === totalKredit} />
            </div>

            <Panel
                judul="Riwayat Jurnal Umum"
                kanan={
                    <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => setFormPengeluaranTerbuka(!formPengeluaranTerbuka)} className="rounded-full bg-red-600 hover:bg-red-700">
                            <Plus className="mr-1 h-4 w-4" /> Pengeluaran
                        </Button>
                        <Button type="button" size="sm" onClick={() => setFormTerbuka(!formTerbuka)} className="rounded-full bg-sky-600 hover:bg-sky-700">
                            <Plus className="mr-1 h-4 w-4" /> Jurnal Manual
                        </Button>
                    </div>
                }
            >
                {formPengeluaranTerbuka && (
                    <div className="mb-5 rounded-xl border border-red-100 bg-red-50/40 p-4">
                        <FormPengeluaran jurnal={jurnal} hariIni={hariIni} />
                    </div>
                )}
                {formTerbuka && (
                    <div className="mb-5 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                        <FormJurnalManual jurnal={jurnal} tipeDiizinkan={["ModalAwal", "Umum"]} hariIni={hariIni} />
                    </div>
                )}
                <div className="mb-3 flex flex-wrap gap-2">
                    <Input placeholder="Cari kode / keterangan / invoice…" value={cari} onChange={(e) => { setCari(e.target.value); setHalaman(1); }} className="h-10 max-w-xs bg-gray-50" />
                    <select className={selectCls} value={jenis} onChange={(e) => { setJenis(e.target.value as typeof jenis); setHalaman(1); }}>
                        <option value="semua">Semua jenis</option>
                        {jenisAda.map((j) => (
                            <option key={j} value={j}>{j}</option>
                        ))}
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <Kepala>{""}</Kepala>
                                <Kepala>Kode</Kepala>
                                <Kepala>Tanggal</Kepala>
                                <Kepala>Jenis</Kepala>
                                <Kepala>Keterangan / Sumber</Kepala>
                                <Kepala kanan>Total Debit</Kepala>
                                <Kepala kanan>Total Kredit</Kepala>
                                <Kepala>Sumber</Kepala>
                            </tr>
                        </thead>
                        <tbody>
                            {daftarHalaman.map((j) => {
                                const d = j.baris.reduce((s, b) => s + b.debit, 0);
                                const k = j.baris.reduce((s, b) => s + b.kredit, 0);
                                const buka = terbuka.has(j.id);
                                return (
                                    <Fragment key={j.id}>
                                        <tr className="border-b border-gray-50 align-top hover:bg-gray-50/60">
                                            <Sel>
                                                <button type="button" onClick={() => toggle(j.id)} className="text-gray-400 hover:text-gray-700" title="Lihat baris jurnal">
                                                    {buka ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </button>
                                            </Sel>
                                            <Sel mono kelas="whitespace-nowrap text-xs">{j.kode}</Sel>
                                            <Sel kelas="whitespace-nowrap">{tanggalID(j.tanggal)}</Sel>
                                            <Sel><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${WARNA_JENIS[j.jenis]}`}>{j.jenis}</span></Sel>
                                            <Sel>
                                                <p>{j.keterangan}</p>
                                                {j.sumber && <p className="text-xs text-gray-400">{j.sumber}</p>}
                                            </Sel>
                                            <Sel kanan mono>{rp(d)}</Sel>
                                            <Sel kanan mono>{rp(k)}</Sel>
                                            <Sel>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${j.otomatis ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{j.otomatis ? "Otomatis" : "Manual"}</span>
                                            </Sel>
                                        </tr>
                                        {buka && (
                                            <tr className="border-b border-gray-50 bg-gray-50/70">
                                                <td />
                                                <td colSpan={7} className="px-3 py-2">
                                                    <table className="w-full max-w-xl text-xs">
                                                        <tbody>
                                                            {j.baris.map((b, i) => (
                                                                <tr key={i}>
                                                                    <td className={`py-0.5 ${b.kredit > 0 ? "pl-6" : ""}`}>{b.kode} — {AKUN_MAP[b.kode]?.nama ?? b.kode}</td>
                                                                    <td className="py-0.5 text-right font-mono">{b.debit ? rp(b.debit) : ""}</td>
                                                                    <td className="py-0.5 text-right font-mono">{b.kredit ? rp(b.kredit) : ""}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                            {daftar.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-3 py-8 text-center text-sm text-gray-400">Tidak ada jurnal pada periode/filter ini.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <PaginationIconsOnly
                    page={halamanAktif}
                    totalPages={totalHalaman}
                    pageSize={ukuranHalaman}
                    totalData={daftar.length}
                    onPageChange={setHalaman}
                    onPageSizeChange={(u) => { setUkuranHalaman(u); setHalaman(1); }} />
                <p className="mt-4 text-xs text-gray-500">
                    Setiap jurnal menampilkan total debit = total kredit. Jurnal <b>Otomatis</b> dibuat dari transaksi asal dan tidak bisa diubah; jurnal <b>Manual</b> dicatat sesuai input dan tersimpan sebagai jejak audit.
                </p>
            </Panel>
        </div>
    );
}

// ── Tab 2. Buku Besar ────────────────────────────────────────────────────────
function TabBukuBesar({ jurnal, mulai, sampai }: { jurnal: Jurnal[]; mulai: string; sampai: string }) {
    const [kode, setKode] = useState("1120");
    const bb = useMemo(() => bukuBesar(jurnal, kode, { mulai, sampai }), [jurnal, kode, mulai, sampai]);
    return (
        <Panel judul="Buku Besar">
            <div className="mb-4 flex flex-wrap items-end gap-3">
                <div>
                    <label className="mb-1 block text-xs text-gray-500">Akun</label>
                    <select className={`${selectCls} w-72`} value={kode} onChange={(e) => setKode(e.target.value)}>
                        {AKUN.map((a) => (
                            <option key={a.kode} value={a.kode}>{a.kode} — {a.nama}</option>
                        ))}
                    </select>
                </div>
                <p className="pb-2 text-xs text-gray-500">Periode {tanggalID(mulai)} s.d. {tanggalID(sampai)} · saldo normal {bb.akun.saldoNormal}</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <Kepala>Tanggal</Kepala>
                            <Kepala>Kode Jurnal</Kepala>
                            <Kepala>Keterangan</Kepala>
                            <Kepala kanan>Debit</Kepala>
                            <Kepala kanan>Kredit</Kepala>
                            <Kepala kanan>Saldo</Kepala>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-100 bg-gray-50 font-medium">
                            <Sel>{""}</Sel>
                            <Sel>{""}</Sel>
                            <Sel>Saldo Awal</Sel>
                            <Sel>{""}</Sel>
                            <Sel>{""}</Sel>
                            <Sel kanan mono>{rp(bb.saldoAwal)}</Sel>
                        </tr>
                        {bb.mutasi.map((m, i) => (
                            <tr key={i} className="border-b border-gray-50">
                                <Sel kelas="whitespace-nowrap">{tanggalID(m.tanggal)}</Sel>
                                <Sel mono kelas="text-xs">{m.kodeJurnal}</Sel>
                                <Sel>{m.keterangan}</Sel>
                                <Sel kanan mono>{m.debit ? rp(m.debit) : "-"}</Sel>
                                <Sel kanan mono>{m.kredit ? rp(m.kredit) : "-"}</Sel>
                                <Sel kanan mono kelas={m.saldo < 0 ? "text-red-600" : ""}>{rp(m.saldo)}</Sel>
                            </tr>
                        ))}
                        {bb.mutasi.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">Tidak ada mutasi pada periode ini.</td>
                            </tr>
                        )}
                        <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                            <Sel>{""}</Sel>
                            <Sel>{""}</Sel>
                            <Sel>Total Mutasi / Saldo Akhir</Sel>
                            <Sel kanan mono>{rp(bb.totalDebit)}</Sel>
                            <Sel kanan mono>{rp(bb.totalKredit)}</Sel>
                            <Sel kanan mono kelas={bb.saldoAkhir < 0 ? "text-red-600" : ""}>{rp(bb.saldoAkhir)}</Sel>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="mt-4 text-xs text-gray-500">
                Saldo berjalan mengikuti saldo normal akun (debit menambah untuk akun bersaldo normal debit, kredit menambah untuk akun bersaldo normal kredit). Setiap mutasi bisa ditelusuri lewat kode jurnal di tab Jurnal Umum. Saldo akhir di sini sama dengan saldo akun di Neraca Saldo bila periode dimulai dari awal pembukuan.
            </p>
        </Panel>
    );
}

// ── Tab 3 & 5. Neraca Saldo (awal / disesuaikan) ─────────────────────────────
function TabelNeracaSaldo({ ns, judul, keterangan }: { ns: NeracaSaldo; judul: string; keterangan: string }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kartu label="Total Debit" nilai={rp(ns.totalDebit)} />
                <Kartu label="Total Kredit" nilai={rp(ns.totalKredit)} />
                <Kartu label="Selisih" nilai={rp(ns.selisih)} ok={ns.seimbang} />
                <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-gray-50">
                    <Lencana ok={ns.seimbang} teksOk="SEIMBANG" teksTidak="TIDAK SEIMBANG" />
                </div>
            </div>
            <Panel judul={judul}>
                <p className="-mt-2 mb-3 text-xs text-gray-500">{keterangan}</p>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <Kepala>Kode</Kepala>
                                <Kepala>Nama Akun</Kepala>
                                <Kepala>Jenis</Kepala>
                                <Kepala kanan>Saldo Debit</Kepala>
                                <Kepala kanan>Saldo Kredit</Kepala>
                            </tr>
                        </thead>
                        <tbody>
                            {ns.baris.map((b) => (
                                <tr key={b.akun.kode} className={`border-b border-gray-50 ${b.abnormal ? "bg-red-50/60" : ""}`}>
                                    <Sel mono>{b.akun.kode}</Sel>
                                    <Sel>
                                        {b.akun.nama}
                                        {b.abnormal && <p className="text-xs text-red-600">{b.catatan}</p>}
                                    </Sel>
                                    <Sel>{b.akun.tipe}</Sel>
                                    <Sel kanan mono>{b.saldoDebit ? rp(b.saldoDebit) : "-"}</Sel>
                                    <Sel kanan mono>{b.saldoKredit ? rp(b.saldoKredit) : "-"}</Sel>
                                </tr>
                            ))}
                            {ns.baris.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-400">Belum ada saldo akun.</td>
                                </tr>
                            )}
                            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                                <Sel>{""}</Sel>
                                <Sel>TOTAL</Sel>
                                <Sel>{""}</Sel>
                                <Sel kanan mono>{rp(ns.totalDebit)}</Sel>
                                <Sel kanan mono>{rp(ns.totalKredit)}</Sel>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}

// ── Tab 4. Jurnal Penyesuaian ────────────────────────────────────────────────
function TabPenyesuaian({ jurnal, hariIni }: { jurnal: Jurnal[]; hariIni: string }) {
    const daftar = jurnal.filter((j) => j.tipe === "Penyesuaian").sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.waktu - a.waktu);
    return (
        <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
                <Panel judul="Input Jurnal Penyesuaian">
                    <FormJurnalManual jurnal={jurnal} tipeDiizinkan={["Penyesuaian"]} hariIni={hariIni} />
                </Panel>
            </div>
            <div className="lg:col-span-2">
                <Panel judul="Catatan">
                    <ul className="list-disc space-y-2 pl-4 text-xs text-gray-600">
                        <li>Jurnal penyesuaian dibuat pada akhir periode untuk: <b>beban dibayar di muka</b>, <b>pendapatan diterima di muka</b>, dan <b>beban yang masih harus dibayar</b> — bila ada.</li>
                        <li><b>Pendapatan diterima di muka</b> diproses otomatis: saat pesanan berstatus Diterima/Selesai, sistem membuat jurnal penyesuaian yang memindahkannya menjadi Penjualan/Pendapatan Jasa.</li>
                        <li><b>Persediaan akhir</b> menentukan HPP: isi nilai bahan baku yang tersisa, selisihnya dijurnal otomatis.</li>
                        <li>Jurnal penyesuaian langsung memengaruhi Neraca Saldo Disesuaikan, Laba Rugi, dan Neraca.</li>
                    </ul>
                </Panel>
            </div>
            <div className="lg:col-span-5">
                <Panel judul="Riwayat Jurnal Penyesuaian">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <Kepala>Kode</Kepala>
                                    <Kepala>Tanggal</Kepala>
                                    <Kepala>Keterangan</Kepala>
                                    <Kepala>Akun (Debit / Kredit)</Kepala>
                                    <Kepala kanan>Nominal</Kepala>
                                    <Kepala>Sumber</Kepala>
                                </tr>
                            </thead>
                            <tbody>
                                {daftar.map((j) => (
                                    <tr key={j.id} className="border-b border-gray-50 align-top">
                                        <Sel mono kelas="text-xs">{j.kode}</Sel>
                                        <Sel kelas="whitespace-nowrap">{tanggalID(j.tanggal)}</Sel>
                                        <Sel>
                                            {j.keterangan}
                                        </Sel>
                                        <Sel kelas="text-xs">
                                            {j.baris.map((b, i) => (
                                                <p key={i} className={b.kredit > 0 ? "pl-4" : ""}>{AKUN_MAP[b.kode]?.nama ?? b.kode}</p>
                                            ))}
                                        </Sel>
                                        <Sel kanan mono>{rp(j.baris.reduce((s, b) => s + b.debit, 0))}</Sel>
                                        <Sel>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${j.otomatis ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{j.otomatis ? "Otomatis" : "Manual"}</span>
                                        </Sel>
                                    </tr>
                                ))}
                                {daftar.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">Belum ada jurnal penyesuaian.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </div>
        </div>
    );
}