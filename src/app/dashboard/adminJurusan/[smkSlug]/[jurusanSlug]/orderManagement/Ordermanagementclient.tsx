"use client";

import { useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import {
    Search,
    Eye,
    RotateCcw,
    CalendarDays,
    Check,
    X as XIcon,
    Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import PaginationIconsOnly from "@/components/pagination/page";
import {
    prosesPesananAction,
    kirimPesananAction,
    tandaiDikerjakanAction,
    selesaikanJasaAction,
} from "@/lib/getdata/get-pesanan-admin";
import type { OrderRow, StatusPembayaranOrder, StatusOrderPengiriman } from "@/types/interfaces/pesananAdmin";

const kategoriOptions = ["Semua", "Produk", "Jasa"];

// Label timeline beda antara Produk (dikirim lewat kurir) dan Jasa (dikerjakan langsung)
const timelineStepsProduk: string[] = ["Belum Membayar", "Diproses", "Dikirim", "Diterima"];
const timelineStepsJasa: string[] = ["Belum Bayar", "Diproses", "Dikerjakan", "Selesai"];

function formatRupiah(value: number) {
    return "Rp " + value.toLocaleString("id-ID");
}

function paymentLabel(status: StatusPembayaranOrder) {
    switch (status) {
        case "Lunas":
            return "Lunas";
        case "Menunggu_Konfirmasi":
            return "Menunggu Konfirmasi";
        case "Gagal":
            return "Gagal";
        default:
            return "Belum Bayar";
    }
}

function paymentBadgeClass(status: StatusPembayaranOrder) {
    switch (status) {
        case "Lunas":
            return "bg-emerald-50 text-emerald-600";
        case "Menunggu_Konfirmasi":
            return "bg-amber-50 text-amber-600";
        default:
            return "bg-red-50 text-red-500";
    }
}

function shippingLabel(status: StatusOrderPengiriman, kategori: "Produk" | "Jasa") {
    if (kategori === "Jasa") {
        switch (status) {
            case "Menunggu":
                return "Menunggu Diproses";
            case "Diproses":
                return "Diproses";
            case "Dikirim":
                return "Dikerjakan";
            case "Selesai":
                return "Selesai";
            case "Dibatalkan":
                return "Dibatalkan";
        }
    }

    switch (status) {
        case "Menunggu":
            return "Menunggu Diproses";
        case "Selesai":
            return "Diterima";
        case "Dibatalkan":
            return "Dibatalkan";
        default:
            return status; // "Diproses" | "Dikirim"
    }
}

function shippingBadgeClass(status: StatusOrderPengiriman) {
    if (status === "Selesai") return "bg-emerald-50 text-emerald-600";
    if (status === "Dikirim") return "bg-sky-50 text-sky-600";
    if (status === "Diproses") return "bg-amber-50 text-amber-600";
    if (status === "Dibatalkan") return "bg-gray-100 text-gray-500";
    return "bg-red-50 text-red-500"; // Menunggu
}

// Menentukan index step aktif di timeline berdasarkan status asli dari database
function getActiveStepIndex(order: OrderRow) {
    if (order.statusPembayaran !== "Lunas") return 0;
    if (order.statusPengiriman === "Menunggu" || order.statusPengiriman === "Diproses") return 1;
    if (order.statusPengiriman === "Dikirim") return 2;
    if (order.statusPengiriman === "Selesai") return 3;
    return 0;
}

function namaTampilan(order: OrderRow) {
    const first = order.items[0]?.nama_produk ?? "-";
    if (order.items.length <= 1) return first;
    return `${first} +${order.items.length - 1} lainnya`;
}

interface OrderManagementClientProps {
    initialOrders: OrderRow[];
}

export default function OrderManagementClient({ initialOrders }: OrderManagementClientProps) {
    const router = useRouter();
    const params = useParams<{ smkSlug: string; jurusanSlug: string }>();
    const slugs = { smkSlug: params.smkSlug, jurusanSlug: params.jurusanSlug };
    const [isPending, startTransition] = useTransition();

    // initialOrders datang dari Server Component (page.tsx) lewat props —
    // dipakai langsung sebagai state awal, tanpa useEffect untuk fetch ulang.
    const [orders, setOrders] = useState<OrderRow[]>(initialOrders);

    const [search, setSearch] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("Semua");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [detailItem, setDetailItem] = useState<OrderRow | null>(null);

    // ── Form kirim pesanan ──
    // Kurir tidak diubah di sini — kurir sudah tetap sesuai pilihan pembeli
    // saat checkout (tersimpan di Pengiriman.kurir). Admin hanya mengisi resi.
    const [shipFormOpen, setShipFormOpen] = useState(false);
    const [shipForm, setShipForm] = useState({ resiNumber: "", estimation: "" });

    const filtered = useMemo(() => {
        return orders.filter((item) => {
            const q = search.toLowerCase();
            const matchSearch =
                namaTampilan(item).toLowerCase().includes(q) ||
                item.buyerName.toLowerCase().includes(q) ||
                item.order_id.toLowerCase().includes(q) ||
                (item.kode_invoice ?? "").toLowerCase().includes(q);
            const matchKategori = kategoriFilter === "Semua" || item.kategori === kategoriFilter;
            const matchDate =
                !dateRange?.from ||
                !dateRange?.to ||
                (item.orderDate >= dateRange.from && item.orderDate <= dateRange.to);
            return matchSearch && matchKategori && matchDate;
        });
    }, [orders, search, kategoriFilter, dateRange]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const openDetail = (item: OrderRow) => setDetailItem(item);
    const closeDetail = () => {
        setDetailItem(null);
        setShipFormOpen(false);
        setShipForm({ resiNumber: "", estimation: "" });
    };

    // Update satu pesanan di state (dicocokkan lewat order_id yang sudah unik dari DB)
    // dan sinkronkan juga ke dialog detail yang sedang terbuka.
    const updateOrder = (order_id: string, updates: Partial<OrderRow>) => {
        setOrders((prev) => prev.map((o) => (o.order_id === order_id ? { ...o, ...updates } : o)));
        setDetailItem((prev) => (prev && prev.order_id === order_id ? { ...prev, ...updates } : prev));
    };

    // AdminJurusan menandai pesanan yang sudah dibayar sebagai "Diproses"
    const handleProsesPesanan = () => {
        if (!detailItem) return;
        const order_id = detailItem.order_id;
        const previousStatus = detailItem.statusPengiriman;

        updateOrder(order_id, { statusPengiriman: "Diproses" });

        startTransition(async () => {
            tampilkanLoading("Memproses pesanan...");
            try {
                await prosesPesananAction(order_id, slugs);
                Swal.close();
                toast.success("Pesanan berhasil diproses");
                router.refresh();
            } catch {
                updateOrder(order_id, { statusPengiriman: previousStatus });
                Swal.close();
                toast.error("Gagal memproses pesanan");
            }
        });
    };

    // Jasa tidak lewat form kurir/resi — cukup ditandai langsung per tahap
    const handleTandaiDikerjakan = () => {
        if (!detailItem) return;
        const order_id = detailItem.order_id;
        const previousStatus = detailItem.statusPengiriman;

        updateOrder(order_id, { statusPengiriman: "Dikirim" });

        startTransition(async () => {
            tampilkanLoading("Menandai pesanan dikerjakan...");
            try {
                await tandaiDikerjakanAction(order_id, slugs);
                Swal.close();
                toast.success("Pesanan ditandai sedang dikerjakan");
                router.refresh();
            } catch {
                updateOrder(order_id, { statusPengiriman: previousStatus });
                Swal.close();
                toast.error("Gagal menandai pesanan dikerjakan");
            }
        });
    };

    const handleSelesaikanJasa = () => {
        if (!detailItem) return;
        const order_id = detailItem.order_id;
        const previousStatus = detailItem.statusPengiriman;

        updateOrder(order_id, { statusPengiriman: "Selesai" });

        startTransition(async () => {
            tampilkanLoading("Menyelesaikan pesanan jasa...");
            try {
                await selesaikanJasaAction(order_id, slugs);
                Swal.close();
                toast.success("Pesanan jasa berhasil diselesaikan");
                router.refresh();
            } catch {
                updateOrder(order_id, { statusPengiriman: previousStatus });
                Swal.close();
                toast.error("Gagal menyelesaikan pesanan jasa");
            }
        });
    };

    const openShipForm = () => {
        if (!detailItem) return;
        setShipForm({ resiNumber: "", estimation: detailItem.estimasi ?? "" });
        setShipFormOpen(true);
    };

    const handleSubmitShip = () => {
        if (!detailItem) return;
        if (!shipForm.resiNumber.trim()) {
            toast.error("Nomor resi wajib diisi");
            return;
        }

        const order_id = detailItem.order_id;
        const previousStatus = detailItem.statusPengiriman;
        const previousResi = detailItem.nomorResi;
        const previousEstimasi = detailItem.estimasi;
        const payload = { nomor_resi: shipForm.resiNumber, estimasi_tiba: shipForm.estimation };

        updateOrder(order_id, {
            statusPengiriman: "Dikirim",
            nomorResi: shipForm.resiNumber,
            estimasi: shipForm.estimation,
        });
        setShipFormOpen(false);

        startTransition(async () => {
            tampilkanLoading("Mengirim pesanan...");
            try {
                await kirimPesananAction(order_id, payload, slugs);
                Swal.close();
                toast.success("Pesanan berhasil ditandai dikirim");
                router.refresh();
            } catch {
                updateOrder(order_id, {
                    statusPengiriman: previousStatus,
                    nomorResi: previousResi,
                    estimasi: previousEstimasi,
                });
                Swal.close();
                toast.error("Gagal mengirim pesanan");
            }
        });
    };

    const handleResetFilter = () => {
        setSearch("");
        setKategoriFilter("Semua");
        setDateRange(undefined);
        setPage(1);
    };

    const dateRangeLabel =
        dateRange?.from && dateRange?.to
            ? `${format(dateRange.from, "d/M/yyyy")} - ${format(dateRange.to, "d/M/yyyy")}`
            : "Pilih tanggal";

    return (
        <div className="space-y-6 px-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Manajemen Pesanan
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Umum</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Manajemen Pesanan</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar: Search + Date Range + Kategori + Ekspor */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="relative flex-1 min-w-22 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 bg-gray-50 border-gray-200 rounded-xl text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="h-9 flex items-center gap-2 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                                    <CalendarDays className="h-4 w-4 text-gray-400" />
                                    {dateRangeLabel}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={(range) => {
                                        setDateRange(range);
                                        setPage(1);
                                    }}
                                    numberOfMonths={2}
                                    locale={localeId}
                                />
                            </PopoverContent>
                        </Popover>

                        <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Kategori</Label>
                            <Select
                                value={kategoriFilter}
                                onValueChange={(v) => {
                                    setKategoriFilter(v);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-40 h-9 text-sm bg-gray-50 border-gray-200 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {kategoriOptions.map((k) => (
                                        <SelectItem key={k} value={k}>
                                            {k}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleResetFilter}
                            variant="outline"
                            className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl self-end gap-1.5"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset Filter
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Invoice</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Nama Produk</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Tanggal Pesanan</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Kategori</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Pembeli</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status Pembayaran</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status Pengiriman</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-right px-6">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                                    Tidak ada data ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((item, idx) => (
                                <TableRow
                                    key={item.order_id}
                                    className="h-16 hover:bg-blue-50/30 transition-colors"
                                >
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6">
                                        {item.kode_invoice ?? item.order_id.slice(0, 8)}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">
                                        {namaTampilan(item)}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6 whitespace-nowrap">
                                        {format(item.orderDate, "dd/MM/yyyy")}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6">
                                        {item.kategori}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6">
                                        {item.buyerName}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span
                                            className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${paymentBadgeClass(
                                                item.statusPembayaran
                                            )}`}
                                        >
                                            {paymentLabel(item.statusPembayaran)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span
                                            className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${shippingBadgeClass(
                                                item.statusPengiriman
                                            )}`}
                                        >
                                            {shippingLabel(item.statusPengiriman, item.kategori)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center justify-end">
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

                {/* Pagination */}
                <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </div>

            {/* ── Dialog Detail Pesanan ── */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && closeDetail()}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 [&>button]:hidden">
                    {detailItem && (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <h2 className="text-base font-semibold text-gray-800">Detail Pesanan</h2>
                                <button
                                    onClick={closeDetail}
                                    className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
                                {/* Tanggal, Invoice & Status */}
                                <div className="flex items-start justify-between">
                                    <div className="text-sm text-gray-500 space-y-0.5">
                                        <p>
                                            Tanggal :{" "}
                                            {format(detailItem.orderDate, "d MMMM yyyy", { locale: localeId })}
                                        </p>
                                        <p>Invoice : {detailItem.kode_invoice ?? "-"}</p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${shippingBadgeClass(
                                            detailItem.statusPengiriman
                                        )}`}
                                    >
                                        Status : {shippingLabel(detailItem.statusPengiriman, detailItem.kategori)}
                                    </span>
                                </div>

                                {/* Detail Produk (bisa lebih dari 1 item per pesanan) */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-700">
                                        {detailItem.kategori === "Jasa" ? "Detail Jasa" : "Detail Produk"}
                                    </h3>

                                    <div className="space-y-2">
                                        {detailItem.items.map((line) => (
                                            <div
                                                key={line.produk_id}
                                                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
                                            >
                                                <div className="h-14 w-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    {line.foto ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={line.foto}
                                                            alt={line.nama_produk}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="text-sm">
                                                    <p className="font-semibold text-gray-800">{line.nama_produk}</p>
                                                    <p className="text-gray-500">Jumlah : {line.jumlah}</p>
                                                    <p className="text-gray-500">Harga : {formatRupiah(line.harga_satuan)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Timeline Pesanan */}
                                    <div className="bg-sky-50/60 rounded-xl p-4">
                                        <p className="text-xs font-medium text-gray-600 mb-3">Timeline Pesanan</p>
                                        <OrderTimeline
                                            activeIndex={getActiveStepIndex(detailItem)}
                                            kategori={detailItem.kategori}
                                        />
                                    </div>
                                </div>

                                {/* Sub total & ongkir */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Sub Total</span>
                                        <span className="text-gray-700 font-medium">
                                            {formatRupiah(detailItem.items.reduce((sum, l) => sum + l.subtotal, 0))}
                                        </span>
                                    </div>
                                    {detailItem.kategori === "Produk" && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Biaya Ongkir</span>
                                            <span className="text-gray-700 font-medium">
                                                {formatRupiah(detailItem.ongkir)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100">
                                        <span className="text-gray-600 font-medium">Total</span>
                                        <span className="text-gray-800 font-semibold">
                                            {formatRupiah(detailItem.totalHarga)}
                                        </span>
                                    </div>
                                </div>

                                {/* Detail Pembeli */}
                                <div className="pt-3 border-t border-gray-100 space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-700">Detail Pembeli</h3>
                                    <dl className="text-sm space-y-1.5">
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Nama</dt>
                                            <dd className="text-gray-700">{detailItem.buyerName}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Nomor</dt>
                                            <dd className="text-gray-700">{detailItem.buyerPhone}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">E-mail</dt>
                                            <dd className="text-gray-700">{detailItem.buyerEmail}</dd>
                                        </div>
                                        {detailItem.kategori === "Produk" && (
                                            <div className="flex justify-between gap-4">
                                                <dt className="text-gray-500 shrink-0">Alamat</dt>
                                                <dd className="text-gray-700 text-right">{detailItem.buyerAddress}</dd>
                                            </div>
                                        )}
                                        {detailItem.kategori === "Produk" && (
                                            <div className="flex justify-between">
                                                <dt className="text-gray-500">Kurir Pilihan</dt>
                                                <dd className="text-gray-700">{detailItem.kurir}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>

                                {/* Detail Pengiriman: khusus kategori Produk, tampil saat sudah Dikirim/Diterima */}
                                {detailItem.kategori === "Produk" &&
                                    (detailItem.statusPengiriman === "Dikirim" ||
                                        detailItem.statusPengiriman === "Selesai") ? (
                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                        <h3 className="text-sm font-semibold text-gray-700">Detail Pengiriman</h3>
                                        <dl className="text-sm space-y-1.5">
                                            <div className="flex justify-between">
                                                <dt className="text-gray-500">Kurir</dt>
                                                <dd className="text-gray-700">{detailItem.kurir}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-500">Nomor Resi</dt>
                                                <dd className="text-gray-700">{detailItem.nomorResi ?? "-"}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-500">Estimasi</dt>
                                                <dd className="text-gray-700">{detailItem.estimasi ?? "-"}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                ) : null}

                                {/* ── Aksi AdminJurusan: ubah status pesanan ── */}
                                {detailItem.statusPembayaran === "Lunas" &&
                                    detailItem.statusPengiriman !== "Selesai" &&
                                    detailItem.statusPengiriman !== "Dibatalkan" && (
                                        <div className="pt-3 border-t border-gray-100 space-y-3">
                                            <h3 className="text-sm font-semibold text-gray-700">Update Status</h3>

                                            {detailItem.statusPengiriman === "Menunggu" && (
                                                <Button
                                                    onClick={handleProsesPesanan}
                                                    disabled={isPending}
                                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg h-9 text-sm"
                                                >
                                                    Proses Pesanan
                                                </Button>
                                            )}

                                            {/* Untuk Jasa: langsung tandai "Dikerjakan" tanpa form resi/kurir */}
                                            {detailItem.kategori === "Jasa" &&
                                                detailItem.statusPengiriman === "Diproses" && (
                                                    <Button
                                                        onClick={handleTandaiDikerjakan}
                                                        disabled={isPending}
                                                        className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 text-sm"
                                                    >
                                                        Tandai Dikerjakan
                                                    </Button>
                                                )}

                                            {/* Untuk Produk: form kurir & resi seperti sebelumnya */}
                                            {detailItem.kategori === "Produk" &&
                                                detailItem.statusPengiriman === "Diproses" &&
                                                !shipFormOpen && (
                                                    <Button
                                                        onClick={openShipForm}
                                                        disabled={isPending}
                                                        className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 text-sm"
                                                    >
                                                        Kirim Pesanan
                                                    </Button>
                                                )}

                                            {detailItem.kategori === "Produk" &&
                                                detailItem.statusPengiriman === "Diproses" &&
                                                shipFormOpen && (
                                                    <div className="space-y-3 bg-sky-50/60 rounded-xl p-4">
                                                        {/* Kurir sudah tetap dari pilihan pembeli saat checkout */}
                                                        <div className="space-y-1.5">
                                                            <Label className="text-sm text-gray-600">Kurir</Label>
                                                            <div className="h-9 flex items-center px-3 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-700">
                                                                {detailItem.kurir}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label className="text-sm text-gray-600">Estimasi Tiba</Label>
                                                            <Input
                                                                value={shipForm.estimation}
                                                                onChange={(e) =>
                                                                    setShipForm((prev) => ({
                                                                        ...prev,
                                                                        estimation: e.target.value,
                                                                    }))
                                                                }
                                                                placeholder="Contoh: 2-3 Hari"
                                                                className="bg-white border-gray-200 rounded-lg"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label className="text-sm text-gray-600">Nomor Resi</Label>
                                                            <Input
                                                                value={shipForm.resiNumber}
                                                                onChange={(e) =>
                                                                    setShipForm((prev) => ({
                                                                        ...prev,
                                                                        resiNumber: e.target.value,
                                                                    }))
                                                                }
                                                                placeholder="Contoh: 439184194861234"
                                                                className="bg-white border-gray-200 rounded-lg"
                                                                autoFocus
                                                            />
                                                        </div>

                                                        <div className="flex justify-end gap-2 pt-1">
                                                            <Button
                                                                onClick={() => setShipFormOpen(false)}
                                                                variant="outline"
                                                                className="rounded-lg h-8 text-sm"
                                                            >
                                                                Batal
                                                            </Button>
                                                            <Button
                                                                onClick={handleSubmitShip}
                                                                disabled={!shipForm.resiNumber || isPending}
                                                                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8 text-sm"
                                                            >
                                                                Simpan &amp; Tandai Dikirim
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Untuk Jasa: tombol selesaikan pengerjaan */}
                                            {detailItem.kategori === "Jasa" &&
                                                detailItem.statusPengiriman === "Dikirim" && (
                                                    <Button
                                                        onClick={handleSelesaikanJasa}
                                                        disabled={isPending}
                                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-9 text-sm"
                                                    >
                                                        Tandai Selesai
                                                    </Button>
                                                )}
                                        </div>
                                    )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Komponen Timeline Pesanan ──
function OrderTimeline({
    activeIndex,
    kategori,
}: {
    activeIndex: number;
    kategori: "Produk" | "Jasa";
}) {
    const steps = kategori === "Jasa" ? timelineStepsJasa : timelineStepsProduk;

    return (
        <div className="flex items-center">
            {steps.map((step, idx) => {
                const isDone = idx < activeIndex;
                const isActive = idx === activeIndex;
                const isLast = idx === steps.length - 1;

                return (
                    <div key={step} className="flex items-center flex-1 last:flex-none">
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
                                {step}
                            </span>
                        </div>
                        {!isLast && (
                            <div
                                className={`h-0.5 flex-1 -mt-5 ${idx < activeIndex ? "bg-sky-900" : "bg-gray-300"
                                    }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}