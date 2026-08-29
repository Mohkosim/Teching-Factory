"use client";

import { useRef, useState, useMemo, useTransition } from "react";
import {
    Search, Eye, Pencil, Trash2, Plus, Wrench, ImagePlus, X,
    ChevronLeft, ChevronRight, FileText, FilePlus,
} from "lucide-react";
import { toast } from "sonner";
import { confirmHapus, tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
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

import { jasaSchema, type JasaForm } from "@/lib/validations/jasa";
import {
    createJasa,
    updateJasa,
    deleteJasa,
    uploadJasaImages,
    // TODO: tambahkan fungsi ini di @/lib/api/jasa-api.ts, contoh implementasi:
    //
    // export async function uploadJasaPortofolio(files: File[]): Promise<string[]> {
    //   const formData = new FormData();
    //   files.forEach((f) => formData.append("files", f));
    //   const res = await fetch("/api/upload/portofolio", { method: "POST", body: formData });
    //   if (!res.ok) throw new Error("Gagal upload portofolio");
    //   const data = await res.json();
    //   return data.urls; // array of file_path/url
    // }
    uploadJasaPortofolio,
} from "@/lib/api/jasa-api";
import type { JasaItem } from "@/types/interfaces/jasa";

// TODO: tambahkan tipe ini di @/types/interfaces/jasa.ts, dan tambahkan
// field `portofolio: PortofolioItem[]` ke interface JasaItem, sesuai model
// Prisma `Portofolio { portofolio_id, jasa_id, file_path, deskripsi }`
export interface PortofolioItem {
    portofolio_id: string;
    file_path: string;
    deskripsi: string | null;
}

const emptyForm: Omit<JasaForm, "fotos"> = {
    nama_jasa: "",
    deskripsi: "",
    harga: 0,
    status: "Tersedia",
    estimasi_pengerjaan: "",
    total_project: 0,
};

const statusOptions = ["Semua", "Tersedia", "Habis", "Nonaktif"] as const;

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PORTOFOLIO_FILES = 10;

function formatRupiah(value: number) {
    return "Rp " + value.toLocaleString("id-ID");
}

function namaFileDariUrl(url: string) {
    try {
        const bersih = url.split("?")[0];
        return decodeURIComponent(bersih.substring(bersih.lastIndexOf("/") + 1));
    } catch {
        return "portofolio.pdf";
    }
}

// Item baru (belum diupload) yang dipasangkan dengan deskripsi per-file
interface NewPortofolioEntry {
    file: File;
    deskripsi: string;
}

function isKontenBerubah(
    original: JasaItem,
    parsed: Omit<JasaForm, "fotos">,
    fotosBaru: string[],
    portofolioBaru: { file_path: string; deskripsi: string | null }[]
): boolean {
    return (
        original.nama_jasa !== parsed.nama_jasa ||
        (original.deskripsi ?? "") !== (parsed.deskripsi ?? "") ||
        original.harga !== parsed.harga ||
        (original.estimasi_pengerjaan ?? "") !== (parsed.estimasi_pengerjaan ?? "") ||
        original.total_project !== parsed.total_project ||
        JSON.stringify(original.fotos) !== JSON.stringify(fotosBaru) ||
        JSON.stringify((original.portofolio ?? []).map((p) => ({ file_path: p.file_path, deskripsi: p.deskripsi }))) !==
        JSON.stringify(portofolioBaru)
    );
}

export default function ServiceManagement({
    initialData,
    jurusanId,
    jurusanSmkId,
    jurusanSmkNama,
}: {
    initialData: JasaItem[];
    jurusanId: string;
    jurusanSmkId: string;
    jurusanSmkNama: string;
}) {
    const [services, setServices] = useState<JasaItem[]>(initialData);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("Semua");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isPending, startTransition] = useTransition();

    const [detailItem, setDetailItem] = useState<JasaItem | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showFullDesc, setShowFullDesc] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [formData, setFormData] = useState<Omit<JasaForm, "fotos">>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [existingFotos, setExistingFotos] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- State untuk portofolio PDF ---
    const [existingPortofolio, setExistingPortofolio] = useState<PortofolioItem[]>([]);
    const [newPortofolio, setNewPortofolio] = useState<NewPortofolioEntry[]>([]);
    const portofolioInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    const MAX_FILES = 5;

    const filtered = useMemo(() => {
        return services.filter((item) => {
            const q = search.toLowerCase();
            const matchSearch =
                item.nama_jasa.toLowerCase().includes(q) ||
                (item.deskripsi ?? "").toLowerCase().includes(q);
            const matchStatus = statusFilter === "Semua" || item.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [services, search, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const openCreateForm = () => {
        setFormMode("create");
        setFormData(emptyForm);
        setEditingId(null);
        setExistingFotos([]);
        setNewFiles([]);
        setNewPreviews([]);
        setExistingPortofolio([]);
        setNewPortofolio([]);
        setFormOpen(true);
    };

    const openEditForm = (item: JasaItem) => {
        setFormMode("edit");
        setEditingId(item.jasa_id);
        setFormData({
            nama_jasa: item.nama_jasa,
            deskripsi: item.deskripsi ?? "",
            harga: item.harga,
            status: item.status,
            estimasi_pengerjaan: item.estimasi_pengerjaan ?? "",
            total_project: item.total_project,
        });
        setExistingFotos(item.fotos);
        setNewFiles([]);
        setNewPreviews([]);
        setExistingPortofolio(item.portofolio ?? []);
        setNewPortofolio([]);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setFormData(emptyForm);
        setEditingId(null);
    };

    const handleFormChange = <K extends keyof Omit<JasaForm, "fotos">>(
        field: K,
        value: Omit<JasaForm, "fotos">[K]
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const totalCount = existingFotos.length + newFiles.length + files.length;
        if (totalCount > MAX_FILES) {
            toast.error(`Maksimal ${MAX_FILES} foto jasa`);
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

    // --- Handler untuk portofolio PDF ---
    const handlePortofolioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const totalCount = existingPortofolio.length + newPortofolio.length + files.length;
        if (totalCount > MAX_PORTOFOLIO_FILES) {
            toast.error(`Maksimal ${MAX_PORTOFOLIO_FILES} file portofolio`);
            return;
        }

        for (const file of files) {
            if (file.type !== "application/pdf") {
                toast.error(`${file.name} harus berformat PDF`);
                return;
            }
            if (file.size > MAX_PDF_SIZE) {
                toast.error(`${file.name} melebihi 5MB`);
                return;
            }
        }

        setNewPortofolio((prev) => [
            ...prev,
            ...files.map((file) => ({ file, deskripsi: "" })),
        ]);
        e.target.value = "";
    };

    const removeExistingPortofolio = (idx: number) => {
        setExistingPortofolio((prev) => prev.filter((_, i) => i !== idx));
    };

    const removeNewPortofolio = (idx: number) => {
        setNewPortofolio((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateExistingPortofolioDeskripsi = (idx: number, deskripsi: string) => {
        setExistingPortofolio((prev) =>
            prev.map((p, i) => (i === idx ? { ...p, deskripsi } : p))
        );
    };

    const updateNewPortofolioDeskripsi = (idx: number, deskripsi: string) => {
        setNewPortofolio((prev) =>
            prev.map((p, i) => (i === idx ? { ...p, deskripsi } : p))
        );
    };

    const openDetail = (item: JasaItem) => {
        setDetailItem(item);
        setActiveImageIndex(0);
        setShowFullDesc(false);
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
            toast.error("Minimal 1 foto jasa");
            return;
        }

        startTransition(async () => {
            tampilkanLoading(formMode === "create" ? "Menambahkan jasa..." : "Menyimpan perubahan...");
            try {
                let uploadedUrls: string[] = [];
                if (newFiles.length > 0) {
                    uploadedUrls = await uploadJasaImages(newFiles);
                }
                const fotos = [...existingFotos, ...uploadedUrls];

                // --- Upload PDF portofolio baru, lalu gabungkan dengan yang lama ---
                let uploadedPortofolioUrls: string[] = [];
                if (newPortofolio.length > 0) {
                    uploadedPortofolioUrls = await uploadJasaPortofolio(
                        newPortofolio.map((p) => p.file)
                    );
                }
                const portofolio = [
                    ...existingPortofolio.map((p) => ({
                        file_path: p.file_path,
                        deskripsi: p.deskripsi,
                    })),
                    ...uploadedPortofolioUrls.map((url, idx) => ({
                        file_path: url,
                        deskripsi: newPortofolio[idx]?.deskripsi || null,
                    })),
                ];

                const parsed = jasaSchema.safeParse({ ...formData, fotos });
                if (!parsed.success) {
                    Swal.close();
                    toast.error(parsed.error.issues[0]?.message ?? "Data tidak valid");
                    return;
                }

                if (formMode === "create") {
                    // TODO: pastikan createJasa menerima field `portofolio` dan
                    // melakukan nested create ke tabel Portofolio (jasa_id = jasa yang baru dibuat)
                    const res = await createJasa({ ...parsed.data, portofolio });
                    const newItem: JasaItem = {
                        jasa_id: res.data.jasa[0].jasa_id,
                        produk_id: res.data.produk_id,
                        nama_jasa: parsed.data.nama_jasa,
                        deskripsi: res.data.deskripsi,
                        fotos,
                        portofolio: res.data.jasa[0].portofolio ?? portofolio.map(
                            (p: { file_path: string; deskripsi: string | null }, i: number) => ({
                                portofolio_id: `temp-${i}`,
                                file_path: p.file_path,
                                deskripsi: p.deskripsi,
                            })
                        ),
                        harga: res.data.harga,
                        status: res.data.status,
                        estimasi_pengerjaan: parsed.data.estimasi_pengerjaan ?? null,
                        total_project: parsed.data.total_project,
                        view_count: res.data.view_count,
                        status_publikasi: res.data.status_publikasi ?? "Pending",
                        catatan_revisi: res.data.catatan_revisi ?? null,
                        jurusan_id: jurusanId,
                        jurusan_smk_id: jurusanSmkId,
                        jurusan_smk_nama: jurusanSmkNama,
                    };
                    setServices((prev) => [newItem, ...prev]);
                    Swal.close();
                    toast.success("Jasa berhasil ditambahkan");
                } else if (formMode === "edit" && editingId) {
                    const original = services.find((s) => s.jasa_id === editingId);

                    const kontenBerubah = original
                        ? isKontenBerubah(original, parsed.data, fotos, portofolio)
                        : true;
                    const harusReviewUlang =
                        kontenBerubah && original?.status_publikasi === "Published";

                    const nextStatusPublikasi = harusReviewUlang
                        ? "Pending"
                        : original?.status_publikasi ?? "Pending";

                    // TODO: pastikan updateJasa menerima field `portofolio` dan
                    // melakukan sinkronisasi (hapus yang tidak ada lagi, create yang baru)
                    // di tabel Portofolio milik jasa ini.
                    await updateJasa(editingId, {
                        ...parsed.data,
                        portofolio,
                        status_publikasi: nextStatusPublikasi,
                    });

                    setServices((prev) =>
                        prev.map((s) =>
                            s.jasa_id === editingId
                                ? {
                                    ...s,
                                    ...parsed.data,
                                    fotos,
                                    portofolio: portofolio.map(
                                        (p: { file_path: string; deskripsi: string | null }, i: number) => ({
                                            portofolio_id:
                                                existingPortofolio[i]?.portofolio_id ?? `temp-${i}`,
                                            file_path: p.file_path,
                                            deskripsi: p.deskripsi,
                                        })
                                    ),
                                    status_publikasi: nextStatusPublikasi,
                                }
                                : s
                        )
                    );

                    Swal.close();
                    toast.success(
                        harusReviewUlang
                            ? "Jasa berhasil diperbarui, menunggu review ulang"
                            : "Jasa berhasil diperbarui"
                    );
                }
                closeForm();
            } catch (err) {
                Swal.close();
                if (err instanceof Error && err.message === "FileTooLarge") {
                    toast.error("Ukuran salah satu file melebihi batas maksimal");
                    return;
                }
                if (err instanceof Error && err.message === "FileTipeSalah") {
                    toast.error("Tipe file tidak didukung");
                    return;
                }
                toast.error(formMode === "create" ? "Gagal menambahkan jasa" : "Gagal memperbarui jasa");
            }
        });
    };

    const handleDelete = (item: JasaItem) => {
        confirmHapus(item.nama_jasa).then((confirmed) => {
            if (!confirmed) return;
            startTransition(async () => {
                tampilkanLoading("Menghapus jasa...");
                try {
                    await deleteJasa(item.jasa_id);
                    setServices((prev) => prev.filter((s) => s.jasa_id !== item.jasa_id));
                    Swal.close();
                    toast.success("Jasa berhasil dihapus");
                } catch {
                    Swal.close();
                    toast.error("Gagal menghapus jasa");
                }
            });
        });
    };

    return (
        <div className="space-y-6 px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Manajemen Jasa
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Umum</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Manajemen Jasa</BreadcrumbPage>
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
                            Tambah Jasa
                        </Button>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Nama Jasa</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Gambar</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Deskripsi</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Harga</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status</TableHead>
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
                                <TableRow key={item.jasa_id} className="h-16 hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">{item.nama_jasa}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="h-10 w-10 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center overflow-hidden">
                                            {item.fotos[0] ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.fotos[0]} alt={item.nama_jasa} className="h-full w-full object-cover" />
                                            ) : (
                                                <Wrench className="h-5 w-5 text-sky-600" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 max-w-xs py-4 px-6">
                                        <span className="line-clamp-2 text-sm">{item.deskripsi || "-"}</span>
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6 whitespace-nowrap">
                                        {formatRupiah(item.harga)}
                                    </TableCell>
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
                                            <button onClick={() => openEditForm(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-500 transition-colors" title="Edit Jasa">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Hapus Jasa">
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
                <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 shrink-0 border-b border-gray-100 bg-sky-50/60">
                        <DialogTitle className="text-base">Detail Jasa</DialogTitle>
                    </DialogHeader>

                    {detailItem && (
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Kolom Gambar */}
                                <div className="space-y-3">
                                    <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                        {detailItem.fotos.length > 0 ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={detailItem.fotos[activeImageIndex]}
                                                alt={detailItem.nama_jasa}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Wrench className="h-10 w-10 text-gray-300" />
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
                                                            alt={`${detailItem.nama_jasa} ${idx + 1}`}
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
                                    <h2 className="text-xl font-bold text-gray-800">{detailItem.nama_jasa}</h2>

                                    <div>
                                        <p className="text-xs text-gray-400">Harga</p>
                                        <p className="text-lg font-bold text-sky-600">
                                            {formatRupiah(detailItem.harga)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className={`text-sm text-gray-500 leading-relaxed ${!showFullDesc ? "line-clamp-3" : ""}`}>
                                            {detailItem.deskripsi || "-"}
                                        </p>
                                        {detailItem.deskripsi && detailItem.deskripsi.length > 120 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowFullDesc((v) => !v)}
                                                className="mt-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                                            >
                                                {showFullDesc ? "Sembunyikan" : "Lihat selengkapnya"}
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-400 pt-1">
                                        Estimasi : {detailItem.estimasi_pengerjaan ?? "-"} &nbsp;·&nbsp; Total Project : {detailItem.total_project} &nbsp;·&nbsp; Status : {detailItem.status}
                                    </p>

                                    {/* Daftar portofolio PDF pada detail */}
                                    {(detailItem.portofolio?.length ?? 0) > 0 && (
                                        <div className="pt-2 space-y-1.5">
                                            <p className="text-xs font-semibold text-gray-500">Portofolio</p>
                                            {detailItem.portofolio!.map((p: PortofolioItem) => (
                                                <a
                                                    key={p.portofolio_id}
                                                    href={p.file_path}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                                                >
                                                    <FileText className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                                    <span className="truncate">
                                                        {p.deskripsi || namaFileDariUrl(p.file_path)}
                                                    </span>
                                                </a>
                                            ))}
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
                <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-gray-100">
                        <DialogTitle>{formMode === "create" ? "Tambah Jasa" : "Edit Jasa"}</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Nama Jasa</Label>
                            <Input
                                value={formData.nama_jasa}
                                onChange={(e) => handleFormChange("nama_jasa", e.target.value)}
                                placeholder="Contoh: Service Laptop"
                                className="bg-gray-50 border-gray-200 rounded-lg"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Deskripsi</Label>
                            <Textarea
                                value={formData.deskripsi}
                                onChange={(e) => handleFormChange("deskripsi", e.target.value)}
                                placeholder="Tulis deskripsi jasa..."
                                className="min-h-24 bg-gray-50 border-gray-200 rounded-lg resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Foto Jasa (maks 5, @2MB)</Label>
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

                        {/* --- Bagian Portofolio PDF --- */}
                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">
                                Portofolio PDF (maks {MAX_PORTOFOLIO_FILES}, @5MB)
                            </Label>

                            <div className="space-y-2">
                                {existingPortofolio.map((p, idx) => (
                                    <div
                                        key={p.portofolio_id}
                                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                                    >
                                        <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                        <a
                                            href={p.file_path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-sky-600 hover:underline truncate max-w-28 shrink-0"
                                        >
                                            {namaFileDariUrl(p.file_path)}
                                        </a>
                                        <Input
                                            value={p.deskripsi ?? ""}
                                            onChange={(e) => updateExistingPortofolioDeskripsi(idx, e.target.value)}
                                            placeholder="Keterangan (opsional)"
                                            className="h-8 flex-1 bg-white border-gray-200 rounded-md text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingPortofolio(idx)}
                                            className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-500"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}

                                {newPortofolio.map((p, idx) => (
                                    <div
                                        key={`new-pf-${idx}`}
                                        className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2"
                                    >
                                        <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                        <span className="text-xs text-gray-600 truncate max-w-28 shrink-0">
                                            {p.file.name}
                                        </span>
                                        <Input
                                            value={p.deskripsi}
                                            onChange={(e) => updateNewPortofolioDeskripsi(idx, e.target.value)}
                                            placeholder="Keterangan (opsional)"
                                            className="h-8 flex-1 bg-white border-gray-200 rounded-md text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeNewPortofolio(idx)}
                                            className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-500"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}

                                {existingPortofolio.length + newPortofolio.length < MAX_PORTOFOLIO_FILES && (
                                    <button
                                        type="button"
                                        onClick={() => portofolioInputRef.current?.click()}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 py-2.5 text-xs text-gray-400 hover:border-sky-400 hover:text-sky-500 transition-colors"
                                    >
                                        <FilePlus className="h-4 w-4" />
                                        Tambah PDF Portofolio
                                    </button>
                                )}
                            </div>

                            <input
                                ref={portofolioInputRef}
                                type="file"
                                accept="application/pdf"
                                multiple
                                className="hidden"
                                onChange={handlePortofolioFileChange}
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
                                <Label className="text-sm text-gray-600">Total Project</Label>
                                <Input
                                    type="number"
                                    value={formData.total_project === 0 ? "" : formData.total_project}
                                    onChange={(e) => handleFormChange("total_project", e.target.value === "" ? 0 : Number(e.target.value))}
                                    placeholder="0"
                                    className="bg-gray-50 border-gray-200 rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Estimasi Pengerjaan</Label>
                                <Input
                                    value={formData.estimasi_pengerjaan}
                                    onChange={(e) => handleFormChange("estimasi_pengerjaan", e.target.value)}
                                    placeholder="3-5 hari kerja"
                                    className="bg-gray-50 border-gray-200 rounded-lg"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Status</Label>
                                <Select value={formData.status} onValueChange={(v) => handleFormChange("status", v as JasaForm["status"])}>
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

                    <DialogFooter className="px-6 py-4 shrink-0 border-t border-gray-100">
                        <Button onClick={closeForm} variant="outline" className="rounded-lg">Batal</Button>
                        <Button onClick={handleSubmitForm} disabled={isPending} className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg">
                            {isPending ? "Menyimpan..." : formMode === "create" ? "Simpan Jasa" : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}