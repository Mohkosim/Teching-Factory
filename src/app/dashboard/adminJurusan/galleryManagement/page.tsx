"use client";

import { useState, useMemo, useRef } from "react";
import {
    Search,
    Eye,
    Pencil,
    Trash2,
    Plus,
    UploadCloud,
    ImageIcon,
    X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import PaginationIconsOnly from "@/components/pagination/page";

// ── Tipe data galeri ──
interface GalleryItem {
    id: number;
    image: string;
    category: string;
    title: string;
    description: string;
}

// Bentuk kosong untuk form tambah/edit foto
type GalleryFormState = {
    image: string;
    category: string;
    description: string;
};

const emptyForm: GalleryFormState = {
    image: "",
    category: "",
    description: "",
};

// ── Dummy data, ganti dengan fetch dari API kalau sudah siap ──
const initialGalleryData: GalleryItem[] = Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    image: "/placeholder-galeri-pameran.png",
    category: "Pameran",
    title: "Nama Kegiatan",
    description: "Deskripsi singkat tentang kegiatan",
}));

const kategoriOptions = ["Semua", "Pameran", "Lomba", "Pelatihan", "Kunjungan", "Wisuda"];
const kategoriFormOptions = ["Pameran", "Lomba", "Pelatihan", "Kunjungan", "Wisuda"];

export default function GalleryManagement() {
    const [gallery, setGallery] = useState<GalleryItem[]>(initialGalleryData);

    const [search, setSearch] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("Semua");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(9);

    // ── Dialog detail (view) ──
    const [detailItem, setDetailItem] = useState<GalleryItem | null>(null);

    // ── Dialog tambah/edit foto ──
    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [formData, setFormData] = useState<GalleryFormState>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Dialog konfirmasi hapus ──
    const [deleteItem, setDeleteItem] = useState<GalleryItem | null>(null);

    const filtered = useMemo(() => {
        return gallery.filter((item) => {
            const matchSearch =
                item.title.toLowerCase().includes(search.toLowerCase()) ||
                item.description.toLowerCase().includes(search.toLowerCase());
            const matchKategori = kategoriFilter === "Semua" || item.category === kategoriFilter;
            return matchSearch && matchKategori;
        });
    }, [gallery, search, kategoriFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // ── Detail (view) ──
    const openDetail = (item: GalleryItem) => setDetailItem(item);
    const closeDetail = () => setDetailItem(null);

    // ── Tambah Foto ──
    const openCreateForm = () => {
        setFormMode("create");
        setFormData(emptyForm);
        setEditingId(null);
        setFormOpen(true);
    };

    // ── Edit Foto ──
    const openEditForm = (item: GalleryItem) => {
        setFormMode("edit");
        setEditingId(item.id);
        setFormData({
            image: item.image,
            category: item.category,
            description: item.description,
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setFormData(emptyForm);
        setEditingId(null);
    };

    const handleFormChange = (field: keyof GalleryFormState, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handlePickFile = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Preview lokal di browser; saat integrasi API, upload file-nya dan simpan URL hasil upload
        const previewUrl = URL.createObjectURL(file);
        handleFormChange("image", previewUrl);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        handleFormChange("image", previewUrl);
    };

    const handleSubmitForm = () => {
        // TODO: ganti dengan pemanggilan API (POST multipart untuk tambah, PUT untuk edit)
        if (formMode === "create") {
            const newItem: GalleryItem = {
                id: Math.max(0, ...gallery.map((g) => g.id)) + 1,
                image: formData.image || "/placeholder-galeri.png",
                category: formData.category,
                title: "Nama Kegiatan",
                description: formData.description,
            };
            setGallery((prev) => [newItem, ...prev]);
        } else if (formMode === "edit" && editingId !== null) {
            setGallery((prev) =>
                prev.map((g) =>
                    g.id === editingId
                        ? {
                              ...g,
                              image: formData.image || g.image,
                              category: formData.category,
                              description: formData.description,
                          }
                        : g
                )
            );
        }

        closeForm();
    };

    // ── Hapus Foto ──
    const openDeleteConfirm = (item: GalleryItem) => setDeleteItem(item);
    const closeDeleteConfirm = () => setDeleteItem(null);

    const handleConfirmDelete = () => {
        if (!deleteItem) return;
        // TODO: panggil API DELETE di sini
        setGallery((prev) => prev.filter((g) => g.id !== deleteItem.id));
        setDeleteItem(null);
    };

    return (
        <div className="space-y-6 px-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Manajemen Galeri
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Umum</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Manajemen Galeri</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Toolbar: Search + Filter + Tambah */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="pl-9 bg-white border-gray-200 rounded-xl text-sm shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs text-gray-500">Kategori</Label>
                        <Select
                            value={kategoriFilter}
                            onValueChange={(v) => {
                                setKategoriFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-40 h-9 text-sm bg-white border-gray-200 rounded-xl shadow-sm">
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
                        onClick={openCreateForm}
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl self-end gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Foto
                    </Button>
                </div>
            </div>

            {/* Grid Galeri */}
            {paginated.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center text-gray-400">
                    Tidak ada data ditemukan
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginated.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
                        >
                            <div className="h-44 w-full bg-gray-100 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                                    }}
                                />
                                <div className="h-full w-full hidden items-center justify-center bg-gray-100">
                                    <ImageIcon className="h-8 w-8 text-gray-300" />
                                </div>
                            </div>

                            <div className="p-4 space-y-2 flex-1 flex flex-col">
                                <span className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium bg-sky-50 text-sky-600">
                                    {item.category}
                                </span>
                                <h3 className="text-sm font-semibold text-gray-800">{item.title}</h3>
                                <p className="text-xs text-gray-400 flex-1">{item.description}</p>

                                <div className="flex items-center gap-4 pt-2 border-t border-gray-100 mt-2">
                                    <button
                                        onClick={() => openDetail(item)}
                                        className="flex items-center gap-1 text-xs font-medium text-emerald-500 hover:text-emerald-600"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Lihat Detail
                                    </button>
                                    <button
                                        onClick={() => openEditForm(item)}
                                        className="flex items-center gap-1 text-xs font-medium text-sky-500 hover:text-sky-600"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => openDeleteConfirm(item)}
                                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                 <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </div>

            {/* ── Dialog Detail / Lihat Foto ── */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && closeDetail()}>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
                    {detailItem && (
                        <>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-sky-50/60">
                                <h2 className="text-base font-semibold text-gray-800">Detail Galeri</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="h-56 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={detailItem.image}
                                        alt={detailItem.title}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                </div>
                                <span className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium bg-sky-50 text-sky-600">
                                    {detailItem.category}
                                </span>
                                <h3 className="text-lg font-bold text-gray-800">{detailItem.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{detailItem.description}</p>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Dialog Tambah / Edit Foto ── */}
            <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 [&>button]:hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-sky-50/60">
                        <h2 className="text-base font-semibold text-gray-800">
                            {formMode === "create" ? "Tambah Foto" : "Edit Foto"}
                        </h2>
                        <button
                            onClick={closeForm}
                            className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        {formMode === "create" ? (
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Upload Gambar</Label>
                                <div
                                    onClick={handlePickFile}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 px-4 cursor-pointer hover:bg-gray-100 transition-colors text-center"
                                >
                                    {formData.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={formData.image}
                                            alt="Preview"
                                            className="h-24 w-24 object-cover rounded-lg"
                                        />
                                    ) : (
                                        <UploadCloud className="h-6 w-6 text-gray-400" />
                                    )}
                                    <p className="text-xs text-gray-400">
                                        Seret dan letakkan file di sini
                                        <br />
                                        atau klik untuk menelusuri
                                    </p>
                                    <span className="px-4 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-medium">
                                        Upload
                                    </span>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Gambar</Label>
                                <div
                                    onClick={handlePickFile}
                                    className="h-40 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer"
                                    title="Klik untuk ganti gambar"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={formData.image}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Kategori</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(v) => handleFormChange("category", v)}
                            >
                                <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg">
                                    <SelectValue placeholder="Pilih Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    {kategoriFormOptions.map((k) => (
                                        <SelectItem key={k} value={k}>
                                            {k}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Keterangan</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => handleFormChange("description", e.target.value)}
                                placeholder={formMode === "create" ? "Masukkan Keterangan" : "Keterangan"}
                                className="min-h-[90px] bg-gray-50 border-gray-200 rounded-lg resize-none"
                            />
                        </div>

                        <Button
                            onClick={handleSubmitForm}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-10"
                        >
                            {formMode === "create" ? "Simpan" : "Edit"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Konfirmasi Hapus ── */}
            <Dialog open={!!deleteItem} onOpenChange={(open) => !open && closeDeleteConfirm()}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Foto</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500">
                        Apakah Anda yakin ingin menghapus foto{" "}
                        <span className="font-medium text-gray-700">{deleteItem?.title}</span>? Tindakan ini
                        tidak dapat dibatalkan.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button onClick={closeDeleteConfirm} variant="outline" className="rounded-lg">
                            Batal
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg"
                        >
                            Hapus
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}