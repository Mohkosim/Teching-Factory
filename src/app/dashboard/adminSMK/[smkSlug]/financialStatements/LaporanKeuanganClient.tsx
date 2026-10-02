"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    AlertTriangle,
    BookOpen,
    ChevronDown,
    ChevronRight,
    Eye,
    FileDown,
    Loader2,
    Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import PaginationIconsOnly from "@/components/pagination/page";
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

import {
    AkunTab,
    ArusKasTab,
    LabaRugiTab,
    NeracaTab,
    PerubahanEkuitasTab,
    ValidasiTab,
} from "@/app/dashboard/adminJurusan/[smkSlug]/[jurusanSlug]/akuntansi/LaporanTabs";
import { Kartu, Kepala, Lencana, Panel, Sel, rp, tanggalID } from "@/app/dashboard/adminJurusan/[smkSlug]/[jurusanSlug]/akuntansi/ui";
import { formatRupiah } from "@/lib/utils/format";
import { toDateInputValue } from "@/lib/utils/tanggal";
import {
    DAFTAR_LAPORAN,
    SEMUA_KUNCI_LAPORAN,
    unduhLaporanKeuanganExcel,
    type KunciLaporan,
    type SumberJurusan,
} from "../../../../../lib/utils/unduh-laporan";

type JenisTransaksi = "Pemasukan" | "Pengeluaran";
type StatusSettlement = "Settled" | "Pending" | "Refund";

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
    varianLabel?: string;
    refund?: { status: "Diajukan" | "Diproses" | "Disetujui" | "Ditolak"; alasan: string };
}

interface LaporanKeuanganClientProps {
    initialTransaksi: TransaksiItem[];
    namaSmk: string;
    jurusanList: SumberJurusan[];
    hariIni: string;
}

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

function gabungkanJurnal(daftar: SumberJurusan[]): { jurnal: Jurnal[]; jurusanPer: Map<string, string> } {
    const jurusanPer = new Map<string, string>();
    const jurnal: Jurnal[] = [];
    for (const j of daftar) {
        for (const x of j.jurnal) {
            const id = `${j.id}:${x.id}`;
            jurusanPer.set(id, j.nama);
            jurnal.push({ ...x, id });
        }
    }
    jurnal.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.waktu - b.waktu || a.kode.localeCompare(b.kode));
    return { jurnal, jurusanPer };
}

function StatusSettlementBadge({ status }: { status: StatusSettlement }) {
    const styles: Record<StatusSettlement, string> = {
        Settled: "bg-emerald-100 text-emerald-600",
        Pending: "bg-amber-100 text-amber-600",
        Refund: "bg-rose-100 text-rose-600",
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
    namaSmk,
    jurusanList,
    hariIni,
}: LaporanKeuanganClientProps) {
    const transaksiData = initialTransaksi;

    const [tab, setTab] = useState<TabId>("ringkasan");

    const [cakupan, setCakupan] = useState<string>("semua");
    const jurusanTerpilih = useMemo(
        () => (cakupan === "semua" ? jurusanList : jurusanList.filter((j) => j.id === cakupan)),
        [cakupan, jurusanList],
    );
    const namaCakupan = cakupan === "semua" ? "Gabungan Semua Jurusan" : `Jurusan ${jurusanTerpilih[0]?.nama ?? ""}`;
    const { jurnal, jurusanPer } = useMemo(() => gabungkanJurnal(jurusanTerpilih), [jurusanTerpilih]);
    const tampilJurusan = jurusanTerpilih.length > 1;

    const peringatan = useMemo(
        () =>
            Array.from(
                new Set(jurusanTerpilih.flatMap((j) => (j.peringatan ?? []).map((p) => (tampilJurusan ? `${j.nama}: ${p}` : p)))),
            ),
        [jurusanTerpilih, tampilJurusan],
    );

    const awal = useMemo(() => {
        const semua = jurusanList
            .map((j) => tanggalAwalPembukuan(j.jurnal))
            .filter((t): t is string => !!t)
            .sort();
        return semua[0] ?? `${hariIni.slice(0, 8)}01`;
    }, [jurusanList, hariIni]);
    const [mulai, setMulai] = useState(awal);
    const [sampai, setSampai] = useState(hariIni);
    const periodeOk = mulai !== "" && sampai !== "" && mulai <= sampai;

    const status = useMemo(() => validasiSistem(jurnal, sampai), [jurnal, sampai]);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [kategoriFilter, setKategoriFilter] = useState<string>("semua");
    const [detailItem, setDetailItem] = useState<TransaksiItem | null>(null);

    const namaJurusanTerpilih = useMemo(() => new Set(jurusanTerpilih.map((j) => j.nama)), [jurusanTerpilih]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return transaksiData.filter((item) => {
            if (!namaJurusanTerpilih.has(item.jurusan)) return false;
            const matchSearch =
                item.noInvoice.toLowerCase().includes(q) ||
                item.pembeliPemasok.toLowerCase().includes(q) ||
                item.deskripsi.toLowerCase().includes(q);
            const matchKategori = kategoriFilter === "semua" || item.jenisTransaksi.toLowerCase() === kategoriFilter;

            let matchDate = true;
            const tgl = toDateInputValue(item.tanggal);
            if (tgl && periodeOk) matchDate = tgl >= mulai && tgl <= sampai;

            return matchSearch && matchKategori && matchDate;
        });
    }, [transaksiData, namaJurusanTerpilih, search, kategoriFilter, mulai, sampai, periodeOk]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const [openUnduh, setOpenUnduh] = useState(false);
    const [laporanDipilih, setLaporanDipilih] = useState<KunciLaporan[]>(SEMUA_KUNCI_LAPORAN);
    const [sedangUnduh, setSedangUnduh] = useState(false);

    const toggleLaporan = (kunci: KunciLaporan, aktif: boolean) =>
        setLaporanDipilih((prev) => (aktif ? [...prev, kunci] : prev.filter((k) => k !== kunci)));

    const handleUnduh = async () => {
        if (laporanDipilih.length === 0) {
            toast.error("Pilih minimal satu laporan");
            return;
        }
        if (!periodeOk) {
            toast.error("Periode belum benar: tanggal “Dari” tidak boleh setelah “Sampai”");
            return;
        }
        setSedangUnduh(true);
        try {
            await unduhLaporanKeuanganExcel({
                namaSmk,
                jurusan: jurusanTerpilih,
                namaCakupan,
                mulai,
                sampai,
                laporan: laporanDipilih,
                transaksi: transaksiData.filter((t) => namaJurusanTerpilih.has(t.jurusan)),
            });
            toast.success("Laporan berhasil diunduh");
            setOpenUnduh(false);
        } catch {
            toast.error("Gagal membuat file laporan, coba lagi");
        } finally {
            setSedangUnduh(false);
        }
    };

    return (
        <div className="space-y-6 px-6">
            <div className="flex flex-col gap-4 rounded-2xl bg-linear-to-r from-sky-500 to-sky-600 p-5 text-white xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-sky-50">Laporan Keuangan — {namaSmk}</p>
                        <p className="text-xl font-bold">Ringkasan, Transaksi &amp; Siklus Akuntansi</p>
                        <p className="text-xs text-sky-50/80">
                            {namaCakupan} · jurnal otomatis dari penjualan, pengeluaran, refund, dan penarikan saldo
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="mb-1 block text-xs text-sky-50">Jurusan</label>
                        <select
                            value={cakupan}
                            onChange={(e) => {
                                setCakupan(e.target.value);
                                setPage(1);
                            }}
                            className="h-10 w-48 rounded-lg border-0 bg-white px-3 text-sm text-gray-800"
                        >
                            <option value="semua">Semua jurusan</option>
                            {jurusanList.map((j) => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-sky-50">Dari</label>
                        <Input
                            type="date"
                            value={mulai}
                            max={sampai}
                            onChange={(e) => {
                                setMulai(e.target.value);
                                setPage(1);
                            }}
                            className="h-10 w-40 border-0 bg-white text-gray-800"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-sky-50">Sampai</label>
                        <Input
                            type="date"
                            value={sampai}
                            min={mulai}
                            onChange={(e) => {
                                setSampai(e.target.value);
                                setPage(1);
                            }}
                            className="h-10 w-40 border-0 bg-white text-gray-800"
                        />
                    </div>
                    <button type="button" onClick={() => setTab("validasi")} title="Lihat detail validasi" className="pb-2.5">
                        <Lencana ok={status.valid} teksOk="SISTEM VALID" teksTidak="TIDAK VALID" />
                    </button>
                    <Button
                        type="button"
                        onClick={() => setOpenUnduh(true)}
                        className="h-10 gap-1.5 rounded-full bg-white px-5 text-sm text-sky-600 hover:bg-sky-50"
                    >
                        <FileDown className="h-4 w-4" />
                        Unduh Laporan
                    </Button>
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
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

                        {/* Filter jenis transaksi (periode & jurusan diatur di header atas) */}
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
                                        <TableCell colSpan={12} className="text-center py-12 text-gray-400">
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
            ) : jurnal.length === 0 && tab !== "akun" ? (
                <Panel>
                    <p className="text-sm text-gray-500">
                        Belum ada jurnal. Jurnal otomatis muncul setelah ada pembayaran pesanan atau pengeluaran pada jurusan.
                    </p>
                </Panel>
            ) : (
                <>
                    {tab === "jurnal-umum" && <TabJurnalUmum jurnal={jurnal} jurusanPer={jurusanPer} tampilJurusan={tampilJurusan} mulai={mulai} sampai={sampai} />}
                    {tab === "buku-besar" && <TabBukuBesar jurnal={jurnal} mulai={mulai} sampai={sampai} />}
                    {tab === "neraca-saldo" && (
                        <TabelNeracaSaldo
                            ns={neracaSaldo(jurnal, { sampai, tanpaPenyesuaian: true })}
                            judul="Neraca Saldo (Sebelum Penyesuaian)"
                            keterangan={`Saldo seluruh akun per ${tanggalID(sampai)} SEBELUM jurnal penyesuaian dimasukkan — untuk memastikan total debit = total kredit sebelum tahap penyesuaian.`}
                        />
                    )}
                    {tab === "jurnal-penyesuaian" && <TabPenyesuaian jurnal={jurnal} jurusanPer={jurusanPer} tampilJurusan={tampilJurusan} />}
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

            {/* ══════════════ Dialog: Unduh Laporan ══════════════ */}
            <Dialog open={openUnduh} onOpenChange={(o) => !sedangUnduh && setOpenUnduh(o)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0">
                        <DialogTitle className="text-sm font-semibold">Unduh Laporan Keuangan (Excel)</DialogTitle>
                    </DialogHeader>

                    <div className="px-5 py-4 space-y-4 overflow-y-auto">
                        <div className="rounded-lg bg-sky-50/60 border border-sky-100 p-3 text-xs text-gray-600 space-y-0.5">
                            <p>Cakupan : <span className="font-medium text-gray-800">{namaCakupan}</span></p>
                            <p>
                                Periode : <span className="font-medium text-gray-800">{tanggalID(mulai)} s.d. {tanggalID(sampai)}</span>
                            </p>
                            <p className="text-gray-400">Ikut pilihan Jurusan, Dari, dan Sampai di bagian atas halaman.</p>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Laporan yang diunduh</span>
                            <button
                                type="button"
                                onClick={() =>
                                    setLaporanDipilih(laporanDipilih.length === SEMUA_KUNCI_LAPORAN.length ? [] : SEMUA_KUNCI_LAPORAN)
                                }
                                className="text-xs text-sky-600 hover:text-sky-700"
                            >
                                {laporanDipilih.length === SEMUA_KUNCI_LAPORAN.length ? "Hapus semua pilihan" : "Pilih semua"}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {DAFTAR_LAPORAN.map((grup) => (
                                <div key={grup.kelompok} className="rounded-lg border border-gray-100 p-3 space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{grup.kelompok}</p>
                                    {grup.item.map((it) => (
                                        <label key={it.kunci} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                                            <Checkbox
                                                checked={laporanDipilih.includes(it.kunci)}
                                                onCheckedChange={(v) => toggleLaporan(it.kunci, v === true)}
                                            />
                                            {it.label}
                                        </label>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-gray-400">Tiap laporan menjadi satu sheet dalam satu file Excel.</p>

                        <Button
                            onClick={handleUnduh}
                            disabled={sedangUnduh || laporanDipilih.length === 0}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full h-10 text-sm gap-1.5"
                        >
                            {sedangUnduh ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                            {sedangUnduh ? "Membuat file..." : "Unduh"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ══════════════ Dialog: Detail Transaksi ══════════════ */}
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
                                {detailItem.varianLabel && <DetailRow label="Varian" value={detailItem.varianLabel} />}
                                <DetailRow
                                    label="Harga Satuan"
                                    value={detailItem.hargaSatuan ? `${formatRupiah(detailItem.hargaSatuan)}` : "-"}
                                />
                                <DetailRow label="Metode Pembayaran" value={detailItem.metodePembayaran} />
                                <DetailRow
                                    label="Status Settlement"
                                    value={<StatusSettlementBadge status={detailItem.statusSettlement} />}
                                />
                                {detailItem.refund && <DetailRow label="Alasan Refund" value={detailItem.refund.alasan} />}
                            </div>

                            <Separator className="my-2.5" />

                            <div className="flex items-center justify-between bg-sky-50/60 border border-sky-100 rounded-lg px-3.5 py-2.5">
                                <span className="text-sm font-medium text-gray-600">Total</span>
                                <span className="text-sm font-bold text-gray-800">{formatRupiah(detailItem.total)}</span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Tab 1. Jurnal Umum (hanya-baca; jurnal manual dicatat admin tiap jurusan) ──
function TabJurnalUmum({
    jurnal, jurusanPer, tampilJurusan, mulai, sampai,
}: { jurnal: Jurnal[]; jurusanPer: Map<string, string>; tampilJurusan: boolean; mulai: string; sampai: string }) {
    const [jenis, setJenis] = useState<"semua" | JenisJurnal>("semua");
    const [cari, setCari] = useState("");
    const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
    const [batas, setBatas] = useState(25);

    const daftar = useMemo(() => {
        const q = cari.toLowerCase();
        return saring(jurnal, { mulai, sampai })
            .filter((j) => (jenis === "semua" || j.jenis === jenis) && (!q || j.kode.toLowerCase().includes(q) || j.keterangan.toLowerCase().includes(q) || (j.sumber ?? "").toLowerCase().includes(q)))
            .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.waktu - a.waktu);
    }, [jurnal, mulai, sampai, jenis, cari]);

    function toggle(id: string) {
        const s = new Set(terbuka);
        if (s.has(id)) s.delete(id);
        else s.add(id);
        setTerbuka(s);
    }

    const jenisAda = Array.from(new Set(jurnal.map((j) => j.jenis)));
    const totalDebit = daftar.reduce((s, j) => s + j.baris.reduce((x, b) => x + b.debit, 0), 0);
    const totalKredit = daftar.reduce((s, j) => s + j.baris.reduce((x, b) => x + b.kredit, 0), 0);
    const jumlahKolom = tampilJurusan ? 9 : 8;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kartu label="Jumlah Jurnal" nilai={String(daftar.length)} />
                <Kartu label="Total Debit" nilai={rp(totalDebit)} />
                <Kartu label="Total Kredit" nilai={rp(totalKredit)} />
                <Kartu label="Selisih" nilai={rp(totalDebit - totalKredit)} ok={totalDebit === totalKredit} />
            </div>

            <Panel judul="Riwayat Jurnal Umum">
                <div className="mb-3 flex flex-wrap gap-2">
                    <Input placeholder="Cari kode / keterangan / invoice…" value={cari} onChange={(e) => setCari(e.target.value)} className="h-10 max-w-xs bg-gray-50" />
                    <select className={selectCls} value={jenis} onChange={(e) => setJenis(e.target.value as typeof jenis)}>
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
                                {tampilJurusan && <Kepala>Jurusan</Kepala>}
                                <Kepala>Jenis</Kepala>
                                <Kepala>Keterangan / Sumber</Kepala>
                                <Kepala kanan>Total Debit</Kepala>
                                <Kepala kanan>Total Kredit</Kepala>
                                <Kepala>Sumber</Kepala>
                            </tr>
                        </thead>
                        <tbody>
                            {daftar.slice(0, batas).map((j) => {
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
                                            {tampilJurusan && <Sel kelas="whitespace-nowrap">{jurusanPer.get(j.id) ?? "-"}</Sel>}
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
                                                <td colSpan={jumlahKolom} className="px-3 py-2">
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
                                    <td colSpan={jumlahKolom + 1} className="px-3 py-8 text-center text-sm text-gray-400">Tidak ada jurnal pada periode/filter ini.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {daftar.length > batas && (
                    <div className="mt-3 text-center">
                        <Button type="button" variant="outline" size="sm" onClick={() => setBatas(batas + 25)}>Tampilkan lebih banyak ({daftar.length - batas} lagi)</Button>
                    </div>
                )}
                <p className="mt-4 text-xs text-gray-500">
                    Setiap jurnal menampilkan total debit = total kredit. Jurnal <b>Otomatis</b> dibuat dari transaksi asal; jurnal <b>Manual</b> dicatat oleh admin jurusan masing-masing. Halaman ini hanya untuk melihat.
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

// ── Tab 4. Jurnal Penyesuaian (hanya-baca; diinput admin tiap jurusan) ───────
function TabPenyesuaian({ jurnal, jurusanPer, tampilJurusan }: { jurnal: Jurnal[]; jurusanPer: Map<string, string>; tampilJurusan: boolean }) {
    const daftar = jurnal.filter((j) => j.tipe === "Penyesuaian").sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.waktu - a.waktu);
    return (
        <div className="space-y-6">
            <Panel judul="Catatan">
                <ul className="list-disc space-y-2 pl-4 text-xs text-gray-600">
                    <li>Jurnal penyesuaian dibuat pada akhir periode untuk: <b>beban dibayar di muka</b>, <b>pendapatan diterima di muka</b>, dan <b>beban yang masih harus dibayar</b> — bila ada.</li>
                    <li><b>Pendapatan diterima di muka</b> diproses otomatis: saat pesanan berstatus Diterima/Selesai, sistem membuat jurnal penyesuaian yang memindahkannya menjadi Penjualan/Pendapatan Jasa.</li>
                    <li><b>Persediaan akhir</b> menentukan HPP: nilai bahan baku yang tersisa diinput oleh admin jurusan, selisihnya dijurnal otomatis.</li>
                    <li>Jurnal penyesuaian langsung memengaruhi Neraca Saldo Disesuaikan, Laba Rugi, dan Neraca. Input jurnal penyesuaian dilakukan di halaman Laporan Keuangan admin jurusan masing-masing; halaman ini hanya untuk melihat.</li>
                </ul>
            </Panel>
            <Panel judul="Riwayat Jurnal Penyesuaian">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <Kepala>Kode</Kepala>
                                <Kepala>Tanggal</Kepala>
                                {tampilJurusan && <Kepala>Jurusan</Kepala>}
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
                                    {tampilJurusan && <Sel kelas="whitespace-nowrap">{jurusanPer.get(j.id) ?? "-"}</Sel>}
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
                                    <td colSpan={tampilJurusan ? 7 : 6} className="px-3 py-6 text-center text-sm text-gray-400">Belum ada jurnal penyesuaian.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}