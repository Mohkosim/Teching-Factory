"use client";

import { useState, useMemo } from "react";
import {
    Search,
    Eye,
    Pencil,
    Trash2,
    Plus,
    Wrench,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import PaginationIconsOnly from "@/components/pagination/page";

// ── Tipe data jasa ──
interface JasaItem {
    id: number;
    name: string;
    images: string[];
    description: string;
    category: string;
    jurusan: string;
    priceMin: number;
    kapasitasProduksi: number;
    tipe: string;
}

// Bentuk kosong untuk form tambah/edit jasa
type JasaFormState = {
    name: string;
    description: string;
    priceMin: string;
    category: string;
    jurusan: string;
    kapasitasProduksi: string;
    tipe: string;
};

const emptyForm: JasaFormState = {
    name: "",
    description: "",
    priceMin: "",
    category: "Jasa",
    jurusan: "TKJ",
    kapasitasProduksi: "",
    tipe: "Jasa",
};

// ── Dummy data, ganti dengan fetch dari API kalau sudah siap ──
const initialJasaData: JasaItem[] = Array.from({ length: 11 }).map((_, i) => ({
    id: i + 1,
    name: "Service Laptop",
    images: [
        "/placeholder-service-laptop-1.png",
        "/placeholder-service-laptop-2.png",
        "/placeholder-service-laptop-3.png",
        "/placeholder-service-laptop-4.png",
    ],
    description:
        "Nikmati layanan Service Laptop profesional yang dikerjakan langsung oleh siswa kompetensi keahlian Teknik Komputer dan Jaringan (TKJ) di bawah bimbingan instruktur berpengalaman. Layanan ini mencakup pemeriksaan menyeluruh, perbaikan perangkat keras dan perangkat lunak, instalasi sistem operasi, upgrade komponen, hingga pembersihan laptop untuk menjaga performa tetap optimal.",
    category: "Jasa",
    jurusan: "Teknik Komputer & Jaringan",
    priceMin: 130000,
    kapasitasProduksi: 20,
    tipe: "Jasa",
}));

const jurusanOptions = ["Semua", "TKJ", "Tata Boga", "Rekayasa Perangkat Lunak", "Tata Busana"];
const kategoriOptions = ["Semua", "Jasa"];
const jurusanFormOptions = ["TKJ", "Tata Boga", "Rekayasa Perangkat Lunak", "Tata Busana"];
const kategoriFormOptions = ["Jasa"];

function formatRupiah(value: number) {
    return "Rp " + value.toLocaleString("id-ID");
}

export default function ServiceManagement() {
    const [jasaList, setJasaList] = useState<JasaItem[]>(initialJasaData);

    const [search, setSearch] = useState("");
    const [jurusanFilter, setJurusanFilter] = useState("Semua");
    const [kategoriFilter, setKategoriFilter] = useState("Semua");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // ── Dialog detail (view) ──
    const [detailItem, setDetailItem] = useState<JasaItem | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // ── Dialog tambah/edit jasa ──
    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [formData, setFormData] = useState<JasaFormState>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);

    // ── Dialog konfirmasi hapus ──
    const [deleteItem, setDeleteItem] = useState<JasaItem | null>(null);

    const filtered = useMemo(() => {
        return jasaList.filter((item) => {
            const matchSearch =
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.description.toLowerCase().includes(search.toLowerCase());
            const matchJurusan = jurusanFilter === "Semua" || item.jurusan === jurusanFilter;
            const matchKategori = kategoriFilter === "Semua" || item.category === kategoriFilter;
            return matchSearch && matchJurusan && matchKategori;
        });
    }, [jasaList, search, jurusanFilter, kategoriFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handleResetFilter = () => {
        setSearch("");
        setJurusanFilter("Semua");
        setKategoriFilter("Semua");
        setPage(1);
    };

    // ── Detail (view) ──
    const openDetail = (item: JasaItem) => {
        setDetailItem(item);
        setActiveImageIndex(0);
    };

    const closeDetail = () => {
        setDetailItem(null);
    };

    const goPrevImage = () => {
        if (!detailItem) return;
        setActiveImageIndex((i) => (i === 0 ? detailItem.images.length - 1 : i - 1));
    };

    const goNextImage = () => {
        if (!detailItem) return;
        setActiveImageIndex((i) => (i === detailItem.images.length - 1 ? 0 : i + 1));
    };

    // ── Tambah Jasa ──
    const openCreateForm = () => {
        setFormMode("create");
        setFormData(emptyForm);
        setEditingId(null);
        setFormOpen(true);
    };

    // ── Edit Jasa ──
    const openEditForm = (item: JasaItem) => {
        setFormMode("edit");
        setEditingId(item.id);
        setFormData({
            name: item.name,
            description: item.description,
            priceMin: String(item.priceMin),
            category: item.category,
            jurusan: item.jurusan,
            kapasitasProduksi: String(item.kapasitasProduksi),
            tipe: item.tipe,
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setFormData(emptyForm);
        setEditingId(null);
    };

    const handleFormChange = (field: keyof JasaFormState, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmitForm = () => {
        // TODO: ganti dengan pemanggilan API (POST untuk tambah, PUT untuk edit)
        const priceMin = Number(formData.priceMin) || 0;
        const kapasitasProduksi = Number(formData.kapasitasProduksi) || 0;

        if (formMode === "create") {
            const newItem: JasaItem = {
                id: Math.max(0, ...jasaList.map((p) => p.id)) + 1,
                name: formData.name,
                images: [],
                description: formData.description,
                category: formData.category,
                jurusan: formData.jurusan,
                priceMin,
                kapasitasProduksi,
                tipe: formData.tipe,
            };
            setJasaList((prev) => [newItem, ...prev]);
        } else if (formMode === "edit" && editingId !== null) {
            setJasaList((prev) =>
                prev.map((p) =>
                    p.id === editingId
                        ? {
                              ...p,
                              name: formData.name,
                              description: formData.description,
                              category: formData.category,
                              jurusan: formData.jurusan,
                              priceMin,
                              kapasitasProduksi,
                              tipe: formData.tipe,
                          }
                        : p
                )
            );
        }

        closeForm();
    };

    // ── Hapus Jasa ──
    const openDeleteConfirm = (item: JasaItem) => {
        setDeleteItem(item);
    };

    const closeDeleteConfirm = () => {
        setDeleteItem(null);
    };

    const handleConfirmDelete = () => {
        if (!deleteItem) return;
        // TODO: panggil API DELETE di sini
        setJasaList((prev) => prev.filter((p) => p.id !== deleteItem.id));
        setDeleteItem(null);
    };

    return (
        <div className="space-y-6 px-6">
            {/* Page Header */}
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

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar: Search + Filters + Reset + Tambah */}
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
                            className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl self-end"
                        >
                            Reset Filter
                        </Button>

                        <Button
                            onClick={openCreateForm}
                            className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl self-end gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Jasa
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Nama Jasa</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Gambar</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Deskripsi</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Kategori</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Jurusan</TableHead>
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
                                <TableRow key={item.id} className="h-16 hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={item.images[0]}
                                                alt={item.name}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = "none";
                                                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                                                }}
                                            />
                                            <Wrench className="h-5 w-5 text-gray-400 hidden" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 max-w-xs py-4 px-6">
                                        <span className="line-clamp-2 text-sm">{item.description}</span>
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6">
                                        {item.category}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6">
                                        {item.jurusan}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => openDetail(item)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors"
                                                title="Lihat Detail"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => openEditForm(item)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-500 transition-colors"
                                                title="Edit Jasa"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => openDeleteConfirm(item)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                                                title="Hapus Jasa"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
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

            {/* ── Dialog Detail Jasa (View) ── */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && closeDetail()}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-sky-50/60">
                        <DialogTitle className="text-base">Detail Jasa</DialogTitle>
                    </DialogHeader>

                    {detailItem && (
                        <div className="px-6 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Kolom Gambar */}
                                <div className="space-y-3">
                                    <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={detailItem.images[activeImageIndex]}
                                            alt={detailItem.name}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={goPrevImage}
                                            className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 shrink-0"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>

                                        <div className="flex items-center gap-1.5 overflow-x-auto">
                                            {detailItem.images.map((img, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActiveImageIndex(idx)}
                                                    className={`h-9 w-9 rounded-md overflow-hidden border shrink-0 transition-all ${
                                                        idx === activeImageIndex
                                                            ? "border-sky-500 ring-2 ring-sky-200"
                                                            : "border-gray-200"
                                                    }`}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={img}
                                                        alt={`${detailItem.name} ${idx + 1}`}
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                        }}
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
                                </div>

                                {/* Kolom Informasi */}
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500">{detailItem.jurusan}</p>
                                    <h2 className="text-xl font-bold text-gray-800">{detailItem.name}</h2>

                                    <div>
                                        <p className="text-xs text-gray-400">Harga Mulai Dari</p>
                                        <p className="text-lg font-bold text-sky-600">
                                            {formatRupiah(detailItem.priceMin)}
                                        </p>
                                    </div>

                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        {detailItem.description}
                                    </p>
                                </div>
                            </div>

                            {/* Info footer: kapasitas & tipe */}
                            <div className="mt-5 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-400">
                                    Kapasitas Produksi : {detailItem.kapasitasProduksi} &nbsp;·&nbsp; Tipe : {detailItem.tipe}
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Dialog Tambah / Edit Jasa ── */}
            <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {formMode === "create" ? "Tambah Jasa" : "Edit Jasa"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Nama Jasa</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => handleFormChange("name", e.target.value)}
                                placeholder="Contoh: Service Laptop"
                                className="bg-gray-50 border-gray-200 rounded-lg"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Deskripsi</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => handleFormChange("description", e.target.value)}
                                placeholder="Tulis deskripsi jasa..."
                                className="min-h-[90px] bg-gray-50 border-gray-200 rounded-lg resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Harga Mulai Dari</Label>
                                <Input
                                    type="number"
                                    value={formData.priceMin}
                                    onChange={(e) => handleFormChange("priceMin", e.target.value)}
                                    placeholder="130000"
                                    className="bg-gray-50 border-gray-200 rounded-lg"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Kapasitas Produksi</Label>
                                <Input
                                    type="number"
                                    value={formData.kapasitasProduksi}
                                    onChange={(e) => handleFormChange("kapasitasProduksi", e.target.value)}
                                    placeholder="20"
                                    className="bg-gray-50 border-gray-200 rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Kategori</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(v) => handleFormChange("category", v)}
                                >
                                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg">
                                        <SelectValue />
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
                                <Label className="text-sm text-gray-600">Jurusan</Label>
                                <Select
                                    value={formData.jurusan}
                                    onValueChange={(v) => handleFormChange("jurusan", v)}
                                >
                                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jurusanFormOptions.map((j) => (
                                            <SelectItem key={j} value={j}>
                                                {j}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={closeForm}
                            variant="outline"
                            className="rounded-lg"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmitForm}
                            className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg"
                        >
                            {formMode === "create" ? "Simpan Jasa" : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Konfirmasi Hapus ── */}
            <Dialog open={!!deleteItem} onOpenChange={(open) => !open && closeDeleteConfirm()}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Jasa</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500">
                        Apakah Anda yakin ingin menghapus jasa{" "}
                        <span className="font-medium text-gray-700">{deleteItem?.name}</span>? Tindakan ini
                        tidak dapat dibatalkan.
                    </p>
                    <DialogFooter>
                        <Button
                            onClick={closeDeleteConfirm}
                            variant="outline"
                            className="rounded-lg"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg"
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}