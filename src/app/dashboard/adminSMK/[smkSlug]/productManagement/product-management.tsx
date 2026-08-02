"use client";

import { useState, useMemo, useTransition } from "react";
import { Search, Eye, Package, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PaginationIconsOnly from "@/components/pagination/page";

import { publikasiProduk, revisiProduk } from "@/lib/api/produk-api";
import type { ProdukItem } from "@/types/interfaces/produk";


function formatRupiah(value: number) {
    return "Rp " + value.toLocaleString("id-ID");
}

export default function ProductManagement({
    initialData,
    jurusanList,
}: {
    initialData: ProdukItem[];
    jurusanList: string[];
}) {
    const [products, setProducts] = useState<ProdukItem[]>(initialData);
    const [search, setSearch] = useState("");
    const [jurusanFilter, setJurusanFilter] = useState("Semua");
    const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("Semua");

    const jurusanOptions = useMemo(() => ["Semua", ...jurusanList], [jurusanList]);
    const statusOptions = ["Semua", "Pending", "Published", "Revisi"] as const;

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isPending, startTransition] = useTransition();

    const [detailItem, setDetailItem] = useState<ProdukItem | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showRevisiForm, setShowRevisiForm] = useState(false);
    const [revisiText, setRevisiText] = useState("");

    const filtered = useMemo(() => {
        return products.filter((item) => {
            const matchSearch =
                item.nama_produk.toLowerCase().includes(search.toLowerCase()) ||
                (item.deskripsi ?? "").toLowerCase().includes(search.toLowerCase());
            const matchJurusan = jurusanFilter === "Semua" || item.nama_jurusan === jurusanFilter;
            const matchStatus = statusFilter === "Semua" || item.status_publikasi === statusFilter;
            return matchSearch && matchJurusan && matchStatus;
        });
    }, [products, search, jurusanFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handleResetFilter = () => {
        setSearch("");
        setJurusanFilter("Semua");
        setStatusFilter("Semua");
        setPage(1);
    };

    const openDetail = (item: ProdukItem) => {
        setDetailItem(item);
        setActiveImageIndex(0);
        setShowRevisiForm(false);
        setRevisiText("");
    };

    const closeDetail = () => {
        setDetailItem(null);
        setShowRevisiForm(false);
        setRevisiText("");
    };

    const goPrevImage = () => {
        if (!detailItem) return;
        setActiveImageIndex((i) => (i === 0 ? detailItem.fotos.length - 1 : i - 1));
    };

    const goNextImage = () => {
        if (!detailItem) return;
        setActiveImageIndex((i) => (i === detailItem.fotos.length - 1 ? 0 : i + 1));
    };

    const handlePublikasi = () => {
        if (!detailItem) return;
        startTransition(async () => {
            try {
                await publikasiProduk(detailItem.produk_id);
                setProducts((prev) =>
                    prev.map((p) =>
                        p.produk_id === detailItem.produk_id
                            ? { ...p, status_publikasi: "Published", catatan_revisi: null }
                            : p
                    )
                );
                toast.success("Produk berhasil dipublikasikan");
                closeDetail();
            } catch {
                toast.error("Gagal mempublikasikan produk");
            }
        });
    };

    const handleSubmitRevisi = () => {
        if (!detailItem) return;
        if (!revisiText.trim()) {
            toast.error("Catatan revisi wajib diisi");
            return;
        }
        startTransition(async () => {
            try {
                await revisiProduk(detailItem.produk_id, revisiText);
                setProducts((prev) =>
                    prev.map((p) =>
                        p.produk_id === detailItem.produk_id
                            ? { ...p, status_publikasi: "Revisi", catatan_revisi: revisiText }
                            : p
                    )
                );
                toast.success("Catatan revisi berhasil dikirim");
                closeDetail();
            } catch {
                toast.error("Gagal mengirim revisi");
            }
        });
    };

    return (
        <div className="space-y-6 px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Manajemen Produk
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Manajemen</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Manajemen Produk</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Jurusan</Label>
                            <Select
                                value={jurusanFilter}
                                onValueChange={(v) => {
                                    setJurusanFilter(v);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-40 h-9 text-sm bg-gray-50 border-gray-200 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {jurusanOptions.map((j) => (
                                        <SelectItem key={j} value={j}>
                                            {j}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Status</Label>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
                            >
                                <SelectTrigger className="w-40 h-9 text-sm bg-gray-50 border-gray-200 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={handleResetFilter} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl self-end">
                            Reset Filter
                        </Button>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Nama Produk</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Gambar</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Harga</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Jurusan</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status Publikasi</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-right px-6">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                                    Tidak ada data ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((item, idx) => (
                                <TableRow key={item.produk_id} className="h-16 hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">{item.nama_produk}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center overflow-hidden">
                                            {item.fotos[0] ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.fotos[0]} alt={item.nama_produk} className="h-full w-full object-cover" />
                                            ) : (
                                                <Package className="h-5 w-5 text-amber-600" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6 whitespace-nowrap">
                                        {formatRupiah(item.harga)}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6">{item.nama_jurusan}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status_publikasi === "Published" ? "bg-emerald-100 text-emerald-600" :
                                            item.status_publikasi === "Revisi" ? "bg-red-100 text-red-600" :
                                                "bg-amber-100 text-amber-600"
                                            }`}>
                                            {item.status_publikasi}
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

                <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </div>

            {/* Dialog Detail */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && closeDetail()}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-sky-50/60">
                        <DialogTitle className="text-base">
                            {showRevisiForm ? "Form Revisi | Detail Produk" : "Detail Produk"}
                        </DialogTitle>
                    </DialogHeader>

                    {detailItem && (
                        <div className="px-6 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                        {detailItem.fotos.length > 0 ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={detailItem.fotos[activeImageIndex]} alt={detailItem.nama_produk} className="h-full w-full object-cover" />
                                        ) : (
                                            <Package className="h-10 w-10 text-gray-300" />
                                        )}
                                    </div>

                                    {detailItem.fotos.length > 1 && (
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={goPrevImage} className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 shrink-0">
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <div className="flex items-center justify-center gap-1.5 overflow-x-auto">
                                                {detailItem.fotos.map((img, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setActiveImageIndex(idx)}
                                                        className={`h-9 w-9 rounded-md overflow-hidden border shrink-0 transition-all ${idx === activeImageIndex ? "border-sky-500 ring-2 ring-sky-200" : "border-gray-200"
                                                            }`}
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={img} alt={`${detailItem.nama_produk} ${idx + 1}`} className="h-full w-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={goNextImage} className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 shrink-0">
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500">{detailItem.nama_jurusan}</p>
                                    <h2 className="text-xl font-bold text-gray-800">{detailItem.nama_produk}</h2>
                                    <div>
                                        <p className="text-xs text-gray-400">Harga</p>
                                        <p className="text-lg font-bold text-sky-600">{formatRupiah(detailItem.harga)}</p>
                                    </div>
                                    <p className="text-sm text-gray-500 leading-relaxed">{detailItem.deskripsi || "-"}</p>

                                    {detailItem.catatan_revisi && (
                                        <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200">
                                            <div className="flex items-center gap-1.5">
                                                <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                                                <p className="text-xs font-semibold text-red-600">
                                                    {detailItem.status_publikasi === "Revisi" ? "Catatan Revisi" : "Catatan Revisi Sebelumnya"}
                                                </p>
                                            </div>
                                            <p className="text-xs text-red-500 mt-1">{detailItem.catatan_revisi}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-400">
                                    Stok : {detailItem.stok} &nbsp;·&nbsp; Status : {detailItem.status_publikasi}
                                </p>

                                {detailItem.status_publikasi !== "Published" && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => setShowRevisiForm((v) => !v)}
                                            disabled={isPending}
                                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg h-8 px-4 text-sm"
                                        >
                                            Revisi
                                        </Button>
                                        <Button
                                            onClick={handlePublikasi}
                                            disabled={isPending}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8 px-4 text-sm"
                                        >
                                            {isPending ? "Memproses..." : "Publikasi"}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {showRevisiForm && (
                                <div className="mt-4 space-y-2">
                                    <Label className="text-sm text-gray-600">Catatan Revisi</Label>
                                    <Textarea
                                        value={revisiText}
                                        onChange={(e) => setRevisiText(e.target.value)}
                                        placeholder="Tulis catatan revisi di sini..."
                                        className="min-h-24 bg-sky-50/60 border-sky-100 rounded-lg resize-none"
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={handleSubmitRevisi}
                                            disabled={isPending}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8 px-5 text-sm"
                                        >
                                            {isPending ? "Mengirim..." : "Submit"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}