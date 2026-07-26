"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
    Search,
    Eye,
    FileOutput,
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

// ── Tipe data pesanan ──
type StatusPembayaran = "Dibayar" | "Belum Dibayar";
type StatusPengiriman = "Menunggu Diproses" | "Diproses" | "Dikirim" | "Diterima";

interface OrderItem {
    id: string;
    productName: string;
    productImage: string;
    orderDate: Date;
    category: "Produk" | "Jasa";
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    buyerAddress: string;
    statusPembayaran: StatusPembayaran;
    statusPengiriman: StatusPengiriman;
    qty: number;
    price: number;
    shippingCost: number;
    selectedCourier: string; // Kurir yang sudah dipilih pembeli saat checkout
    courier: string; // Kurir final yang tercatat saat pesanan ditandai "Dikirim"
    resiNumber: string;
    estimation: string;
}

// Estimasi pengiriman default per kurir.
// TODO: kalau API kurir/ongkir sudah tersedia, ganti mapping statis ini dengan
// estimasi asli yang tersimpan di record pesanan saat checkout.
const courierEstimasiMap: Record<string, string> = {
    "JNE": "2-3 Hari",
    "J&T": "3-4 Hari",
    "SiCepat": "1-2 Hari",
    "AnterAja": "2-4 Hari",
    "Pos Indonesia": "4-6 Hari",
};

const kurirOptions = Object.keys(courierEstimasiMap);

// ── Dummy data, ganti dengan fetch dari API kalau sudah siap ──
const initialOrderData: OrderItem[] = Array.from({ length: 11 }).map((_, i) => {
    const statuses: { bayar: StatusPembayaran; kirim: StatusPengiriman }[] = [
        { bayar: "Dibayar", kirim: "Diterima" },
        { bayar: "Belum Dibayar", kirim: "Menunggu Diproses" },
        { bayar: "Dibayar", kirim: "Dikirim" },
        { bayar: "Dibayar", kirim: "Diproses" },
    ];
    const s = statuses[i % statuses.length];
    const isShipped = s.kirim === "Dikirim" || s.kirim === "Diterima";
    // Kurir ini dipilih pembeli sendiri waktu checkout, bukan oleh admin
    const chosenCourier = kurirOptions[i % kurirOptions.length];

    return {
        id: "011",
        productName: "Vest Rajut",
        productImage: "/placeholder-vest-rajut.png",
        orderDate: new Date(2025, 1, 26),
        category: i % 3 === 1 ? "Jasa" : "Produk",
        buyerName: "John Efendi",
        buyerPhone: "081232324141",
        buyerEmail: "Johnefendi@gmail.com",
        buyerAddress: "Jl Tanah Mas 37 Semarang, Jawa Tengah",
        statusPembayaran: s.bayar,
        statusPengiriman: s.kirim,
        qty: 1,
        price: 30000,
        shippingCost: 20000,
        selectedCourier: chosenCourier,
        courier: isShipped ? chosenCourier : "",
        resiNumber: isShipped ? "439184194861234" : "",
        estimation: isShipped ? courierEstimasiMap[chosenCourier] : "",
    };
});

const kategoriOptions = ["Semua", "Produk", "Jasa"];

const timelineSteps: string[] = ["Belum Membayar", "Diproses", "Dikirim", "Diterima"];

function formatRupiah(value: number) {
    return "Rp " + value.toLocaleString("id-ID");
}

function paymentBadgeClass(status: StatusPembayaran) {
    return status === "Dibayar"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-red-50 text-red-500";
}

function shippingBadgeClass(status: StatusPengiriman) {
    if (status === "Diterima") return "bg-emerald-50 text-emerald-600";
    if (status === "Dikirim") return "bg-sky-50 text-sky-600";
    if (status === "Diproses") return "bg-amber-50 text-amber-600";
    return "bg-red-50 text-red-500";
}

// Menentukan index step aktif di timeline berdasarkan status pesanan
function getActiveStepIndex(order: OrderItem) {
    if (order.statusPembayaran === "Belum Dibayar") return 0;
    if (order.statusPengiriman === "Menunggu Diproses") return 1;
    if (order.statusPengiriman === "Diproses") return 1;
    if (order.statusPengiriman === "Dikirim") return 2;
    return 3; // Diterima
}

export default function OrderManagement() {
    const [orders, setOrders] = useState<OrderItem[]>(initialOrderData);

    const [search, setSearch] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("Semua");
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(2025, 1, 20),
        to: new Date(2026, 1, 25),
    });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [detailItem, setDetailItem] = useState<OrderItem | null>(null);

    // ── Form kirim pesanan ──
    // Kurir & estimasi otomatis mengikuti pilihan pembeli saat checkout,
    // admin hanya perlu mengisi nomor resi.
    const [shipFormOpen, setShipFormOpen] = useState(false);
    const [shipForm, setShipForm] = useState({ courier: "", resiNumber: "", estimation: "" });

    const filtered = useMemo(() => {
        return orders.filter((item) => {
            const matchSearch =
                item.productName.toLowerCase().includes(search.toLowerCase()) ||
                item.buyerName.toLowerCase().includes(search.toLowerCase()) ||
                item.id.toLowerCase().includes(search.toLowerCase());
            const matchKategori = kategoriFilter === "Semua" || item.category === kategoriFilter;
            const matchDate =
                !dateRange?.from ||
                !dateRange?.to ||
                (item.orderDate >= dateRange.from && item.orderDate <= dateRange.to);
            return matchSearch && matchKategori && matchDate;
        });
    }, [orders, search, kategoriFilter, dateRange]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const openDetail = (item: OrderItem) => setDetailItem(item);
    const closeDetail = () => {
        setDetailItem(null);
        setShipFormOpen(false);
        setShipForm({ courier: "", resiNumber: "", estimation: "" });
    };

    // Update satu pesanan di state, dan sinkronkan juga ke dialog detail yang sedang terbuka.
    // Dicocokkan lewat referensi objek karena data dummy di sini punya id yang sama ("011") untuk semua baris.
    // Kalau id dari API sudah unik, ganti pencocokan ini jadi `o.id === id`.
    const updateOrder = (updates: Partial<OrderItem>) => {
        setOrders((prev) => prev.map((o) => (o === detailItem ? { ...o, ...updates } : o)));
        setDetailItem((prev) => (prev ? { ...prev, ...updates } : prev));
    };

    // AdminJurusan menandai pesanan yang sudah dibayar sebagai "Diproses"
    const handleProsesPesanan = () => {
        if (!detailItem) return;
        // TODO: PATCH /api/orders/:id/status  { statusPengiriman: "Diproses" }
        updateOrder({ statusPengiriman: "Diproses" });
    };

    // Buka form input resi sebelum menandai pesanan sebagai "Dikirim".
    // Kurir & estimasi otomatis diisi dari `selectedCourier` (pilihan pembeli),
    // admin tidak perlu memilih ulang.
    const openShipForm = () => {
        if (!detailItem) return;
        const courier = detailItem.selectedCourier;
        setShipForm({
            courier,
            resiNumber: "",
            estimation: courierEstimasiMap[courier] ?? "",
        });
        setShipFormOpen(true);
    };

    const handleSubmitShip = () => {
        if (!detailItem) return;
        // TODO: PATCH /api/orders/:id/status  { statusPengiriman: "Dikirim", courier, resiNumber, estimation }
        updateOrder({
            statusPengiriman: "Dikirim",
            courier: shipForm.courier,
            resiNumber: shipForm.resiNumber,
            estimation: shipForm.estimation,
        });
        setShipFormOpen(false);
    };

    const handleEksporLaporan = () => {
        // TODO: panggil API export laporan (misal generate & download Excel/PDF)
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
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
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
                            onClick={handleEksporLaporan}
                            className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl self-end gap-1.5"
                        >
                            <FileOutput className="h-4 w-4" />
                            Ekspor Laporan
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">ID</TableHead>
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
                                    key={`${item.id}-${idx}`}
                                    className="h-16 hover:bg-blue-50/30 transition-colors"
                                >
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6">{item.id}</TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">
                                        {item.productName}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6 whitespace-nowrap">
                                        {format(item.orderDate, "dd/MM/yyyy")}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6">
                                        {item.category}
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
                                            {item.statusPembayaran}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span
                                            className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${shippingBadgeClass(
                                                item.statusPengiriman
                                            )}`}
                                        >
                                            {item.statusPengiriman}
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
                                {/* Tanggal, ID & Status */}
                                <div className="flex items-start justify-between">
                                    <div className="text-sm text-gray-500 space-y-0.5">
                                        <p>
                                            Tanggal :{" "}
                                            {format(detailItem.orderDate, "d MMMM yyyy", { locale: localeId })}
                                        </p>
                                        <p>ID : {detailItem.id}</p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${shippingBadgeClass(
                                            detailItem.statusPengiriman
                                        )}`}
                                    >
                                        Status : {detailItem.statusPengiriman}
                                    </span>
                                </div>

                                {/* Detail Produk */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-700">Detail Produk</h3>

                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <div className="h-14 w-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={detailItem.productImage}
                                                alt={detailItem.productName}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = "none";
                                                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                                                }}
                                            />
                                            <Package className="h-5 w-5 text-gray-400 hidden" />
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-semibold text-gray-800">{detailItem.productName}</p>
                                            <p className="text-gray-500">Jumlah : {detailItem.qty}</p>
                                            <p className="text-gray-500">Harga : {formatRupiah(detailItem.price)}</p>
                                        </div>
                                    </div>

                                    {/* Timeline Pesanan */}
                                    <div className="bg-sky-50/60 rounded-xl p-4">
                                        <p className="text-xs font-medium text-gray-600 mb-3">Timeline Pesanan</p>
                                        <OrderTimeline activeIndex={getActiveStepIndex(detailItem)} />
                                    </div>
                                </div>

                                {/* Sub total & ongkir */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Sub Total</span>
                                        <span className="text-gray-700 font-medium">
                                            {formatRupiah(detailItem.qty * detailItem.price)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Biaya Ongkir</span>
                                        <span className="text-gray-700 font-medium">
                                            {formatRupiah(detailItem.shippingCost)}
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
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-gray-500 shrink-0">Alamat</dt>
                                            <dd className="text-gray-700 text-right">{detailItem.buyerAddress}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Kurir Pilihan</dt>
                                            <dd className="text-gray-700">{detailItem.selectedCourier}</dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Detail Pengiriman: hanya tampil kalau sudah ada data kurir/resi */}
                                {detailItem.statusPengiriman === "Dikirim" ||
                                    detailItem.statusPengiriman === "Diterima" ? (
                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                        <h3 className="text-sm font-semibold text-gray-700">Detail Pengiriman</h3>
                                        <dl className="text-sm space-y-1.5">
                                            <div className="flex justify-between">
                                                <dt className="text-gray-500">Kurir</dt>
                                                <dd className="text-gray-700">{detailItem.courier}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-500">Nomor Resi</dt>
                                                <dd className="text-gray-700">{detailItem.resiNumber}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-gray-500">Estimasi</dt>
                                                <dd className="text-gray-700">{detailItem.estimation}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                ) : null}

                                {/* ── Aksi AdminJurusan: ubah status pesanan ── */}
                                {detailItem.statusPembayaran === "Dibayar" &&
                                    detailItem.statusPengiriman !== "Diterima" && (
                                        <div className="pt-3 border-t border-gray-100 space-y-3">
                                            <h3 className="text-sm font-semibold text-gray-700">Update Status</h3>

                                            {detailItem.statusPengiriman === "Menunggu Diproses" && (
                                                <Button
                                                    onClick={handleProsesPesanan}
                                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg h-9 text-sm"
                                                >
                                                    Proses Pesanan
                                                </Button>
                                            )}

                                            {detailItem.statusPengiriman === "Diproses" && !shipFormOpen && (
                                                <Button
                                                    onClick={openShipForm}
                                                    className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-9 text-sm"
                                                >
                                                    Kirim Pesanan
                                                </Button>
                                            )}

                                            {detailItem.statusPengiriman === "Diproses" && shipFormOpen && (
                                                <div className="space-y-3 bg-sky-50/60 rounded-xl p-4">
                                                    {/* Kurir & Estimasi otomatis dari pilihan pembeli saat checkout,
                                                        admin tidak perlu mengubahnya */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-sm text-gray-600">Kurir</Label>
                                                            <div className="h-9 flex items-center px-3 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-700">
                                                                {shipForm.courier}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-sm text-gray-600">Estimasi</Label>
                                                            <div className="h-9 flex items-center px-3 rounded-lg bg-gray-100 border border-gray-200 text-sm text-gray-700">
                                                                {shipForm.estimation}
                                                            </div>
                                                        </div>
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
                                                            disabled={!shipForm.resiNumber}
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8 text-sm"
                                                        >
                                                            Simpan &amp; Tandai Dikirim
                                                        </Button>
                                                    </div>
                                                </div>
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
function OrderTimeline({ activeIndex }: { activeIndex: number }) {
    return (
        <div className="flex items-center">
            {timelineSteps.map((step, idx) => {
                const isDone = idx < activeIndex;
                const isActive = idx === activeIndex;
                const isLast = idx === timelineSteps.length - 1;

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