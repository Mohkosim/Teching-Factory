"use client";

import { useState, useMemo, useRef, useTransition } from "react";
import {
    Search, Eye, Pencil, Trash2, Plus, ImagePlus, ImageIcon, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import PaginationIconsOnly from "@/components/pagination/page";
import { galeriSchema, type GaleriForm } from "@/lib/validations/galeri";
import { createGaleri, updateGaleri, deleteGaleri, uploadGaleriImage } from "@/lib/api/galeri-api";
import type { GaleriItem } from "@/types/interfaces/galeri";

const emptyForm: GaleriForm = {
    judul: "",
    deskripsi: "",
    kategori: "Pameran",
    image: "",
};

const kategoriOptions = ["Semua", "Pameran", "Lomba", "Pelatihan", "Kunjungan"];
const kategoriFormOptions = ["Pameran", "Lomba", "Pelatihan", "Kunjungan"];

export default function GalleryManagement({ initialData }: { initialData: GaleriItem[] }) {
    const [gallery, setGallery] = useState<GaleriItem[]>(initialData);

    const [search, setSearch] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("Semua");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isPending, startTransition] = useTransition();

    const [detailItem, setDetailItem] = useState<GaleriItem | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [formData, setFormData] = useState<GaleriForm>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newFile, setNewFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [deleteItem, setDeleteItem] = useState<GaleriItem | null>(null);

    const MAX_FILE_SIZE = 2 * 1024 * 1024;

    const filtered = useMemo(() => {
        return gallery.filter((item) => {
            const matchSearch =
                item.judul.toLowerCase().includes(search.toLowerCase()) ||
                (item.deskripsi ?? "").toLowerCase().includes(search.toLowerCase());
            const matchKategori = kategoriFilter === "Semua" || item.kategori === kategoriFilter;
            return matchSearch && matchKategori;
        });
    }, [gallery, search, kategoriFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const openDetail = (item: GaleriItem) => setDetailItem(item);
    const closeDetail = () => setDetailItem(null);

    const openCreateForm = () => {
        setFormMode("create");
        setFormData(emptyForm);
        setEditingId(null);
        setNewFile(null);
        setPreview("");
        setFormOpen(true);
    };

    const openEditForm = (item: GaleriItem) => {
        setFormMode("edit");
        setEditingId(item.galeri_id);
        setFormData({
            judul: item.judul,
            deskripsi: item.deskripsi ?? "",
            kategori: item.kategori,
            image: item.image,
        });
        setNewFile(null);
        setPreview(item.image);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setFormData(emptyForm);
        setEditingId(null);
        setNewFile(null);
        setPreview("");
    };

    const handleFormChange = <K extends keyof GaleriForm>(field: K, value: GaleriForm[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handlePickFile = () => fileInputRef.current?.click();

    const pickFile = (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("File harus berupa gambar");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error("Ukuran file maksimal 2MB");
            return;
        }
        setNewFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) pickFile(file);
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) pickFile(file);
    };

    const handleSubmitForm = () => {
        if (!newFile && !formData.image) {
            toast.error("Gambar wajib diunggah");
            return;
        }
        if (!formData.judul.trim()) {
            toast.error("Judul wajib diisi");
            return;
        }

        startTransition(async () => {
            try {
                let imageUrl = formData.image;
                if (newFile) {
                    imageUrl = await uploadGaleriImage(newFile);
                }

                const parsed = galeriSchema.safeParse({ ...formData, image: imageUrl });
                if (!parsed.success) {
                    toast.error(parsed.error.issues[0]?.message ?? "Data tidak valid");
                    return;
                }

                if (formMode === "create") {
                    const res = await createGaleri(parsed.data);
                    setGallery((prev) => [res.data, ...prev]);
                    toast.success("Foto berhasil ditambahkan");
                } else if (formMode === "edit" && editingId) {
                    await updateGaleri(editingId, parsed.data);
                    setGallery((prev) =>
                        prev.map((g) => (g.galeri_id === editingId ? { ...g, ...parsed.data } : g))
                    );
                    toast.success("Foto berhasil diperbarui");
                }
                closeForm();
            } catch (err) {
                if (err instanceof Error && err.message === "FileTooLarge") {
                    toast.error("Ukuran file melebihi 2MB");
                    return;
                }
                if (err instanceof Error && err.message === "FileTipeSalah") {
                    toast.error("Tipe file tidak didukung");
                    return;
                }
                toast.error(formMode === "create" ? "Gagal menambahkan foto" : "Gagal memperbarui foto");
            }
        });
    };

    const openDeleteConfirm = (item: GaleriItem) => setDeleteItem(item);
    const closeDeleteConfirm = () => setDeleteItem(null);

    const handleConfirmDelete = () => {
        if (!deleteItem) return;
        startTransition(async () => {
            try {
                await deleteGaleri(deleteItem.galeri_id);
                setGallery((prev) => prev.filter((g) => g.galeri_id !== deleteItem.galeri_id));
                toast.success("Foto berhasil dihapus");
                setDeleteItem(null);
            } catch {
                toast.error("Gagal menghapus foto");
            }
        });
    };

    return (
        <div className="space-y-6 px-6">
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

            <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
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
                        <Label className="text-xs text-gray-500">Kategori</Label>
                        <Select
                            value={kategoriFilter}
                            onValueChange={(v) => { setKategoriFilter(v); setPage(1); }}
                        >
                            <SelectTrigger className="w-40 h-9 text-sm bg-gray-50 border-gray-200 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {kategoriOptions.map((k) => (
                                    <SelectItem key={k} value={k}>{k}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={openCreateForm} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl self-end gap-1.5">
                        <Plus className="h-4 w-4" />
                        Tambah Foto
                    </Button>
                </div>
            </div>

            {paginated.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center text-gray-400">
                    Tidak ada data ditemukan
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginated.map((item) => (
                        <div key={item.galeri_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            <div className="h-44 w-full bg-gray-100 overflow-hidden flex items-center justify-center">
                                {item.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.image} alt={item.judul} className="h-full w-full object-cover" />
                                ) : (
                                    <ImageIcon className="h-8 w-8 text-gray-300" />
                                )}
                            </div>

                            <div className="p-4 space-y-2 flex-1 flex flex-col">
                                <span className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium bg-sky-50 text-sky-600">
                                    {item.kategori}
                                </span>
                                <h3 className="text-sm font-semibold text-gray-800">{item.judul}</h3>
                                <p className="text-xs text-gray-400 flex-1">{item.deskripsi || "-"}</p>

                                <div className="flex items-center gap-4 pt-2 border-t border-gray-100 mt-2">
                                    <button onClick={() => openDetail(item)} className="flex items-center gap-1 text-xs font-medium text-emerald-500 hover:text-emerald-600">
                                        <Eye className="h-3.5 w-3.5" />
                                        Lihat Detail
                                    </button>
                                    <button onClick={() => openEditForm(item)} className="flex items-center gap-1 text-xs font-medium text-sky-500 hover:text-sky-600">
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                    </button>
                                    <button onClick={() => openDeleteConfirm(item)} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600">
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </div>

            {/* Detail */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && closeDetail()}>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
                    {detailItem && (
                        <>
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-sky-50/60">
                                <h2 className="text-base font-semibold text-gray-800">Detail Galeri</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="h-56 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    {detailItem.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={detailItem.image} alt={detailItem.judul} className="h-full w-full object-cover" />
                                    ) : (
                                        <ImageIcon className="h-10 w-10 text-gray-300" />
                                    )}
                                </div>
                                <span className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium bg-sky-50 text-sky-600">
                                    {detailItem.kategori}
                                </span>
                                <h3 className="text-lg font-bold text-gray-800">{detailItem.judul}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{detailItem.deskripsi || "-"}</p>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Tambah / Edit */}
            <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 [&>button]:hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-sky-50/60">
                        <h2 className="text-base font-semibold text-gray-800">
                            {formMode === "create" ? "Tambah Foto" : "Edit Foto"}
                        </h2>
                        <button onClick={closeForm} className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Upload Gambar</Label>
                            <div className="flex flex-wrap gap-2">
                                {preview ? (
                                    <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-sky-200 group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewFile(null);
                                                setPreview("");
                                                handleFormChange("image", "");
                                            }}
                                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handlePickFile}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleDrop}
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
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Judul Kegiatan</Label>
                            <Input
                                value={formData.judul}
                                onChange={(e) => handleFormChange("judul", e.target.value)}
                                placeholder="Contoh: Pameran Karya Siswa 2026"
                                className="bg-gray-50 border-gray-200 rounded-lg"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Kategori</Label>
                            <Select value={formData.kategori} onValueChange={(v) => handleFormChange("kategori", v as GaleriForm["kategori"])}>
                                <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg">
                                    <SelectValue placeholder="Pilih Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    {kategoriFormOptions.map((k) => (
                                        <SelectItem key={k} value={k}>{k}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Keterangan</Label>
                            <Textarea
                                value={formData.deskripsi}
                                onChange={(e) => handleFormChange("deskripsi", e.target.value)}
                                placeholder="Masukkan Keterangan"
                                className="min-h-20 bg-gray-50 border-gray-200 rounded-lg resize-none"
                            />
                        </div>

                        <Button
                            onClick={handleSubmitForm}
                            disabled={isPending}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-10"
                        >
                            {isPending ? "Menyimpan..." : formMode === "create" ? "Simpan" : "Edit"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Hapus */}
            <Dialog open={!!deleteItem} onOpenChange={(open) => !open && closeDeleteConfirm()}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Foto</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500">
                        Apakah Anda yakin ingin menghapus foto{" "}
                        <span className="font-medium text-gray-700">{deleteItem?.judul}</span>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button onClick={closeDeleteConfirm} variant="outline" className="rounded-lg">Batal</Button>
                        <Button onClick={handleConfirmDelete} disabled={isPending} className="bg-red-500 hover:bg-red-600 text-white rounded-lg">
                            {isPending ? "Menghapus..." : "Hapus"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}