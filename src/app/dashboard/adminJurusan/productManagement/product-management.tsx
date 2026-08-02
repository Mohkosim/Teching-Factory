"use client";

import { useRef, useState, useMemo, useTransition } from "react";
import { Search, Eye, Pencil, Trash2, Plus, Package, ImagePlus, X, ChevronLeft, ChevronRight } from "lucide-react";
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
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PaginationIconsOnly from "@/components/pagination/page";

import { produkSchema, type ProdukForm } from "@/lib/validations/produk";
import { createProduk, updateProduk, deleteProduk, uploadProdukImages } from "@/lib/api/produk-api";
import type { ProdukItem } from "@/types/interfaces/produk";

const emptyForm: ProdukForm = {
    nama_produk: "",
    deskripsi: "",
    harga: 0,
    status: "Tersedia",
    stok: 0,
    kondisi: "Baru",
    fotos: [],
};

const statusOptions = ["Semua", "Tersedia", "Habis", "Nonaktif"] as const;

function formatRupiah(value: number) {
    return "Rp " + value.toLocaleString("id-ID");
}

export default function ProductManagement({ initialData }: { initialData: ProdukItem[] }) {
    const [products, setProducts] = useState<ProdukItem[]>(initialData);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("Semua");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isPending, startTransition] = useTransition();

    const [detailItem, setDetailItem] = useState<ProdukItem | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [formData, setFormData] = useState<ProdukForm>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [deleteItem, setDeleteItem] = useState<ProdukItem | null>(null);

    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const [existingFotos, setExistingFotos] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    const MAX_FILES = 5;

    const filtered = useMemo(() => {
        return products.filter((item) => {
            const q = search.toLowerCase();
            const matchSearch =
                item.nama_produk.toLowerCase().includes(q) ||
                (item.deskripsi ?? "").toLowerCase().includes(q);
            const matchStatus = statusFilter === "Semua" || item.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [products, search, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const openCreateForm = () => {
        setFormMode("create");
        setFormData(emptyForm);
        setEditingId(null);
        setExistingFotos([]);
        setNewFiles([]);
        setNewPreviews([]);
        setFormOpen(true);
    };

    const openEditForm = (item: ProdukItem) => {
        setFormMode("edit");
        setEditingId(item.produk_id);
        setFormData({
            nama_produk: item.nama_produk,
            deskripsi: item.deskripsi ?? "",
            harga: item.harga,
            status: item.status,
            stok: item.stok,
            kondisi: item.kondisi ?? "Baru",
            fotos: item.fotos,
        });
        setExistingFotos(item.fotos);
        setNewFiles([]);
        setNewPreviews([]);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setFormData(emptyForm);
        setEditingId(null);
    };

    const handleFormChange = <K extends keyof ProdukForm>(field: K, value: ProdukForm[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const totalCount = existingFotos.length + newFiles.length + files.length;
        if (totalCount > MAX_FILES) {
            toast.error(`Maksimal ${MAX_FILES} gambar per produk`);
            return;
        }

        for (const file of files) {
            if (!file.type.startsWith("image/")) {
                toast.error(`${file.name} bukan file gambar`);
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`${file.name} melebihi 2MB`);
                return;
            }
        }

        setNewFiles((prev) => [...prev, ...files]);
        setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
        e.target.value = "";
    };

    const removeExistingFoto = (idx: number) => {
        setExistingFotos((prev) => prev.filter((_, i) => i !== idx));
    };

    const removeNewFoto = (idx: number) => {
        URL.revokeObjectURL(newPreviews[idx]);
        setNewFiles((prev) => prev.filter((_, i) => i !== idx));
        setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
    };

    const openDetail = (item: ProdukItem) => {
        setDetailItem(item);
        setActiveImageIndex(0);
    };

    const goPrevImage = () => {
        if (!detailItem) return;
        setActiveImageIndex((i) => (i === 0 ? detailItem.fotos.length - 1 : i - 1));
    };

    const goNextImage = () => {
        if (!detailItem) return;
        setActiveImageIndex((i) => (i === detailItem.fotos.length - 1 ? 0 : i + 1));
    };

    const handleSubmitForm = () => {
        if (existingFotos.length + newFiles.length === 0) {
            toast.error("Minimal 1 foto produk");
            return;
        }

        startTransition(async () => {
            try {
                let uploadedUrls: string[] = [];
                if (newFiles.length > 0) {
                    uploadedUrls = await uploadProdukImages(newFiles);
                }
                const fotos = [...existingFotos, ...uploadedUrls];

                const parsed = produkSchema.safeParse({ ...formData, fotos });
                if (!parsed.success) {
                    toast.error(parsed.error.issues[0]?.message ?? "Data tidak valid");
                    return;
                }

                if (formMode === "create") {
                    const res = await createProduk(parsed.data);
                    const newItem: ProdukItem = {
                        produk_id: res.data.produk_id,
                        jurusan_id: res.data.jurusan_id,
                        nama_produk: res.data.nama_produk,
                        deskripsi: res.data.deskripsi,
                        fotos,
                        harga: res.data.harga,
                        status: res.data.status,
                        view_count: res.data.view_count,
                        sold_count: res.data.sold_count,
                        stok: parsed.data.stok,
                        kondisi: parsed.data.kondisi,
                        status_publikasi: res.data.status_publikasi ?? "Pending",
                    };
                    setProducts((prev) => [newItem, ...prev]);
                    toast.success("Produk berhasil ditambahkan");
                } else if (formMode === "edit" && editingId) {
                    await updateProduk(editingId, parsed.data);
                    setProducts((prev) =>
                        prev.map((p) =>
                            p.produk_id === editingId
                                ? { ...p, ...parsed.data, fotos, status_publikasi: "Pending" }
                                : p
                        )
                    );
                    toast.success("Produk berhasil diperbarui, menunggu review ulang");
                }
                closeForm();
            } catch (err) {
                if (err instanceof Error && err.message === "FileTooLarge") {
                    toast.error("Ukuran salah satu file melebihi 2MB");
                    return;
                }
                if (err instanceof Error && err.message === "FileTipeSalah") {
                    toast.error("Tipe file tidak didukung");
                    return;
                }
                toast.error(formMode === "create" ? "Gagal menambahkan produk" : "Gagal memperbarui produk");
            }
        });
    };

    const handleConfirmDelete = () => {
        if (!deleteItem) return;
        startTransition(async () => {
            try {
                await deleteProduk(deleteItem.produk_id);
                setProducts((prev) => prev.filter((p) => p.produk_id !== deleteItem.produk_id));
                toast.success("Produk berhasil dihapus");
                setDeleteItem(null);
            } catch {
                toast.error("Gagal menghapus produk");
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
                        <BreadcrumbItem>Umum</BreadcrumbItem>
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
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 bg-gray-50 border-gray-200 rounded-xl text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
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
                        <Button onClick={openCreateForm} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl self-end gap-1.5">
                            <Plus className="h-4 w-4" />
                            Tambah Produk
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
                            <TableHead className="font-semibold text-gray-600 px-6">Stok</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status Publikasi</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-right px-15">Aksi</TableHead>
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
                                    <TableCell className="text-gray-600 text-sm py-4 px-6">{item.stok}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === "Tersedia" ? "bg-green-100 text-green-600" :
                                            item.status === "Habis" ? "bg-amber-100 text-amber-600" :
                                                "bg-red-100 text-red-600"
                                            }`}>
                                            {item.status}
                                        </span>
                                    </TableCell>

                                    <TableCell className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status_publikasi === "Published" ? "bg-emerald-100 text-emerald-600" :
                                            item.status_publikasi === "Revisi" ? "bg-red-100 text-red-600" :
                                                "bg-amber-100 text-amber-600"
                                            }`}>
                                            {item.status_publikasi}
                                        </span>
                                    </TableCell>

                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => openDetail(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors" title="Lihat Detail">
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => openEditForm(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-500 transition-colors" title="Edit Produk">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => setDeleteItem(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Hapus Produk">
                                                <Trash2 className="h-3.5 w-3.5" />
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

            {/* Detail */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-sky-50/60">
                        <DialogTitle className="text-base">Detail Produk</DialogTitle>
                    </DialogHeader>

                    {detailItem && (
                        <div className="px-6 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Kolom Gambar */}
                                <div className="space-y-3">
                                    <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                        {detailItem.fotos.length > 0 ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={detailItem.fotos[activeImageIndex]}
                                                alt={detailItem.nama_produk}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Package className="h-10 w-10 text-gray-300" />
                                        )}
                                    </div>

                                    {detailItem.fotos.length > 1 && (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={goPrevImage}
                                                className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 shrink-0"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>

                                            <div className="flex items-center justify-center gap-1.5 overflow-x-auto">
                                                {detailItem.fotos.map((img, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setActiveImageIndex(idx)}
                                                        className={`h-9 w-9 rounded-md overflow-hidden border shrink-0 transition-all ${idx === activeImageIndex
                                                            ? "border-sky-500 ring-2 ring-sky-200"
                                                            : "border-gray-200"
                                                            }`}
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={img}
                                                            alt={`${detailItem.nama_produk} ${idx + 1}`}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={goNextImage}
                                                className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 shrink-0"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Kolom Informasi */}
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-gray-800">{detailItem.nama_produk}</h2>

                                    <div>
                                        <p className="text-xs text-gray-400">Harga</p>
                                        <p className="text-lg font-bold text-sky-600">
                                            {formatRupiah(detailItem.harga)}
                                        </p>
                                    </div>

                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        {detailItem.deskripsi || "-"}
                                    </p>

                                    <p className="text-xs text-gray-400 pt-1">
                                        Stok : {detailItem.stok} &nbsp;·&nbsp; Terjual : {detailItem.sold_count} &nbsp;·&nbsp; Kondisi : {detailItem.kondisi ?? "-"}
                                    </p>

                                    {/* Status Publikasi */}
                                    <div className="pt-1">
                                        <p className="text-xs text-gray-400 mb-1">Status Publikasi</p>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${detailItem.status_publikasi === "Published" ? "bg-emerald-100 text-emerald-600" :
                                            detailItem.status_publikasi === "Revisi" ? "bg-red-100 text-red-600" :
                                                "bg-amber-100 text-amber-600"
                                            }`}>
                                            {detailItem.status_publikasi}
                                        </span>
                                    </div>

                                    {/* Catatan Revisi (kalau ada) */}
                                    {detailItem.status_publikasi === "Revisi" && detailItem.catatan_revisi && (
                                        <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-100">
                                            <p className="text-xs font-medium text-red-600">Catatan Revisi:</p>
                                            <p className="text-xs text-red-500 mt-1">{detailItem.catatan_revisi}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Tambah / Edit */}
            <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{formMode === "create" ? "Tambah Produk" : "Edit Produk"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Nama Produk</Label>
                            <Input
                                value={formData.nama_produk}
                                onChange={(e) => handleFormChange("nama_produk", e.target.value)}
                                placeholder="Contoh: Bento Cake"
                                className="bg-gray-50 border-gray-200 rounded-lg"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Deskripsi</Label>
                            <Textarea
                                value={formData.deskripsi}
                                onChange={(e) => handleFormChange("deskripsi", e.target.value)}
                                placeholder="Tulis deskripsi produk..."
                                className="min-h-30 bg-gray-50 border-gray-200 rounded-lg resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Foto Produk (maks 5, @2MB)</Label>
                            <div className="flex flex-wrap gap-2">
                                {existingFotos.map((url, idx) => (
                                    <div key={`old-${idx}`} className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200 group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="" className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingFoto(idx)}
                                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}

                                {newPreviews.map((url, idx) => (
                                    <div key={`new-${idx}`} className="relative h-20 w-20 rounded-lg overflow-hidden border border-sky-200 group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="" className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeNewFoto(idx)}
                                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}

                                {existingFotos.length + newFiles.length < MAX_FILES && (
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
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Harga</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                                        Rp
                                    </span>
                                    <Input
                                        type="number"
                                        value={formData.harga === 0 ? "" : formData.harga}
                                        onChange={(e) => handleFormChange("harga", e.target.value === "" ? 0 : Number(e.target.value))}
                                        placeholder="0"
                                        className="bg-gray-50 border-gray-200 rounded-lg pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Stok</Label>
                                <Input
                                    type="number"
                                    value={formData.stok === 0 ? "" : formData.stok}
                                    onChange={(e) => handleFormChange("stok", e.target.value === "" ? 0 : Number(e.target.value))}
                                    placeholder="0"
                                    className="bg-gray-50 border-gray-200 rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Kondisi</Label>
                                <Input
                                    value={formData.kondisi}
                                    onChange={(e) => handleFormChange("kondisi", e.target.value)}
                                    placeholder="Baru / Bekas"
                                    className="bg-gray-50 border-gray-200 rounded-lg"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Status</Label>
                                <Select value={formData.status} onValueChange={(v) => handleFormChange("status", v as ProdukForm["status"])}>
                                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Tersedia">Tersedia</SelectItem>
                                        <SelectItem value="Habis">Habis</SelectItem>
                                        <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={closeForm} variant="outline" className="rounded-lg">Batal</Button>
                        <Button onClick={handleSubmitForm} disabled={isPending} className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg">
                            {isPending ? "Menyimpan..." : formMode === "create" ? "Simpan Produk" : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hapus */}
            <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Hapus Produk</DialogTitle></DialogHeader>
                    <p className="text-sm text-gray-500">
                        Apakah Anda yakin ingin menghapus produk{" "}
                        <span className="font-medium text-gray-700">{deleteItem?.nama_produk}</span>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <DialogFooter>
                        <Button onClick={() => setDeleteItem(null)} variant="outline" className="rounded-lg">Batal</Button>
                        <Button onClick={handleConfirmDelete} disabled={isPending} className="bg-red-500 hover:bg-red-600 text-white rounded-lg">
                            {isPending ? "Menghapus..." : "Hapus"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}