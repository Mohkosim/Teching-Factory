"use client";

import { useState } from "react";
import { Plus, Search, Eye, Pencil, Trash2, ArrowLeft, Package, GraduationCap } from "lucide-react";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import PaginationIconsOnly from "@/components/pagination/page";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminJurusan {
    id: number;
    jurusan: string;
    logo: string | null;
    description: string;
    phoneNumber: string;
}

interface SMKDetail {
    id: number;
    name: string;
    description: string;
    photo: string | null;
    totalProdukJasa: number;
    totalJurusan: number;
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const smkDetail: SMKDetail = {
    id: 1,
    name: "SMK A",
    description:
        "SMK A mempelajari keterampilan mendesain, membuat pola, menjahit, hingga menghasilkan produk busana yang kreatif dan berkualitas.",
    photo: null,
    totalProdukJasa: 3210,
    totalJurusan: 5,
};

const adminJurusanData: AdminJurusan[] = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    jurusan: "Telekomunikasi",
    logo: null,
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    phoneNumber: "08231238261123",
}));

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─── Component ────────────────────────────────────────────────────────────────


interface Props {
    id: string | null;
}

export default function DetailAkunSMK({ id }: Props) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Dialog states
    const [viewItem, setViewItem] = useState<AdminJurusan | null>(null);
    const [editItem, setEditItem] = useState<AdminJurusan | null>(null);
    const [deleteItem, setDeleteItem] = useState<AdminJurusan | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    // Edit form
    const [editForm, setEditForm] = useState({
        jurusan: "",
        description: "",
        phoneNumber: "",
        logo: null as File | null,
        logoPreview: "",
    });

    // Create form
    const [createForm, setCreateForm] = useState({
        jurusan: "",
        description: "",
        phoneNumber: "",
        logo: null as File | null,
    });

    const filtered = adminJurusanData.filter(
        (item) =>
            item.jurusan.toLowerCase().includes(search.toLowerCase()) ||
            item.description.toLowerCase().includes(search.toLowerCase()) ||
            item.phoneNumber.includes(search)
    );

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handlePageChange = (p: number) => {
        if (p >= 1 && p <= totalPages) setPage(p);
    };

    const getPageNumbers = () => {
        const pages: (number | "...")[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("...");
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                pages.push(i);
            }
            if (page < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    const openEdit = (item: AdminJurusan) => {
        setEditItem(item);
        setEditForm({
            jurusan: item.jurusan,
            description: item.description,
            phoneNumber: item.phoneNumber,
            logo: null,
            logoPreview: "",
        });
    };

    return (
        <div className="space-y-6 px-6">
            {/* ── Page Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/superAdmin/accountManagement"
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                        Detail Akun SMK
                    </h1>
                </div>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Manajemen</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            Manajemen Akun
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Detail</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* ── SMK Info Card + Stats ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Info Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start gap-5">
                    {/* Photo */}
                    <div className="flex-shrink-0 h-32 w-48 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        {smkDetail.photo ? (
                            <img
                                src={smkDetail.photo}
                                alt={smkDetail.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-blue-50">
                                <GraduationCap className="h-16 w-16 text-blue-300" />
                            </div>
                        )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 space-y-2">
                        <h2 className="text-xl font-bold text-gray-800">{smkDetail.name}</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">{smkDetail.description}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col gap-4">
                    {/* Produk & Jasa */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold text-gray-800">
                                {smkDetail.totalProdukJasa.toLocaleString("id-ID")}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">Produk &amp; Jasa</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-blue-500" />
                        </div>
                    </div>

                    {/* Jurusan */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{smkDetail.totalJurusan}</p>
                            <p className="text-sm text-gray-500 mt-0.5">Jurusan</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-blue-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── List Admin Jurusan ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-800">List Admin Jurusan</h2>
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-sm shadow-blue-200"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Admin
                    </Button>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600">No</TableHead>
                            <TableHead className="font-semibold text-gray-600">SMK</TableHead>
                            <TableHead className="font-semibold text-gray-600">Logo</TableHead>
                            <TableHead className="font-semibold text-gray-600">Deskripsi</TableHead>
                            <TableHead className="font-semibold text-gray-600">Nomor WA</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                                    Tidak ada data ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((item, idx) => (
                                <TableRow key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="text-gray-500 font-medium">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700">{item.jurusan}</TableCell>
                                    <TableCell>
                                        <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm overflow-hidden">
                                            {item.logo ? (
                                                <img src={item.logo} alt={item.jurusan} className="h-full w-full object-cover" />
                                            ) : (
                                                <GraduationCap className="h-5 w-5 text-blue-500" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 max-w-xs">
                                        <span className="line-clamp-2 text-sm">{item.description}</span>
                                    </TableCell>
                                    <TableCell className="text-gray-600 font-mono text-sm">{item.phoneNumber}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => setViewItem(item)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors"
                                                title="Lihat Detail"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteItem(item)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                                                title="Hapus"
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
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/30">
                    <p className="text-sm text-gray-500">
                        Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–
                        {Math.min(page * pageSize, filtered.length)} of {filtered.length} data
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>Tampilkan :</span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                            >
                                <SelectTrigger className="h-8 w-20 text-xs border-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <PaginationIconsOnly
                            page={page}
                            totalPages={totalPages}
                            pageSize={pageSize}
                            totalData={filtered.length}
                            onPageChange={(p) => setPage(p)}
                            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
                    </div>
                </div>
            </div>

            {/* ── Create Admin Dialog ── */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Admin Jurusan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-800">Nama Jurusan</label>
                            <Input
                                placeholder="Masukkan Nama Jurusan"
                                value={createForm.jurusan}
                                onChange={(e) => setCreateForm({ ...createForm, jurusan: e.target.value })}
                                className="rounded-xl border-gray-200 bg-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-800">Deskripsi Singkat</label>
                            <textarea
                                placeholder="Masukkan Deskripsi Singkat"
                                value={createForm.description}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                rows={4}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-800">Nomor WA</label>
                            <Input
                                placeholder="Masukkan Nomor WA"
                                value={createForm.phoneNumber}
                                onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                                className="rounded-xl border-gray-200 bg-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-800">Upload Logo</label>
                            <div
                                className="border border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => document.getElementById("create-admin-logo")?.click()}
                            >
                                {createForm.logo ? (
                                    <div className="space-y-2">
                                        <img
                                            src={URL.createObjectURL(createForm.logo)}
                                            alt="Preview"
                                            className="h-24 w-24 object-cover rounded-lg mx-auto"
                                        />
                                        <p className="text-xs text-gray-500">{createForm.logo.name}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-400">Seret dan letakkan file di sini</p>
                                        <p className="text-xs text-gray-400">atau klik untuk menelusuri</p>
                                        <button type="button" className="mt-1 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-full transition-colors">
                                            Upload
                                        </button>
                                    </div>
                                )}
                                <input
                                    id="create-admin-logo"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setCreateForm({ ...createForm, logo: file });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full">
                            Batal
                        </Button>
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                            onClick={() => {
                                setCreateOpen(false);
                                setCreateForm({ jurusan: "", description: "", phoneNumber: "", logo: null });
                            }}
                        >
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── View Admin Dialog ── */}
            <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detail Admin Jurusan</DialogTitle>
                    </DialogHeader>
                    {viewItem && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center">
                                    <GraduationCap className="h-8 w-8 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{viewItem.jurusan}</h3>
                                    <p className="text-sm text-gray-500 font-mono">{viewItem.phoneNumber}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Deskripsi</p>
                                    <p className="text-sm text-gray-700 mt-1">{viewItem.description}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Nomor WA</p>
                                    <p className="text-sm text-gray-700 mt-1 font-mono">{viewItem.phoneNumber}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewItem(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Admin Dialog ── */}
            <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Admin Jurusan</DialogTitle>
                    </DialogHeader>
                    {editItem && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-800">Nama Jurusan</label>
                                <Input
                                    value={editForm.jurusan}
                                    onChange={(e) => setEditForm({ ...editForm, jurusan: e.target.value })}
                                    className="rounded-xl border-gray-200 bg-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-800">Deskripsi Singkat</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={4}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-800">Nomor WA</label>
                                <Input
                                    value={editForm.phoneNumber}
                                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                    className="rounded-xl border-gray-200 bg-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-800">Logo</label>
                                <div
                                    className="cursor-pointer"
                                    onClick={() => document.getElementById("edit-admin-logo")?.click()}
                                >
                                    {editForm.logoPreview ? (
                                        <img
                                            src={editForm.logoPreview}
                                            alt="Logo Preview"
                                            className="h-28 w-44 object-cover rounded-xl border border-gray-200"
                                        />
                                    ) : (
                                        <div className="h-28 w-44 rounded-xl bg-blue-100 border-2 border-blue-200 flex items-center justify-center hover:bg-blue-50 transition-colors">
                                            <div className="text-center space-y-1">
                                                <GraduationCap className="h-10 w-10 text-blue-400 mx-auto" />
                                                <p className="text-xs text-blue-400">Klik untuk upload</p>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        id="edit-admin-logo"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setEditForm({
                                                    ...editForm,
                                                    logo: file,
                                                    logoPreview: URL.createObjectURL(file),
                                                });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditItem(null)} className="rounded-full">
                            Batal
                        </Button>
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                            onClick={() => setEditItem(null)}
                        >
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Admin Dialog ── */}
            <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Admin Jurusan</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500 py-2">
                        Apakah Anda yakin ingin menghapus admin jurusan{" "}
                        <span className="font-semibold text-gray-700">{deleteItem?.jurusan}</span>? Tindakan ini tidak
                        dapat dibatalkan.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white"
                            onClick={() => setDeleteItem(null)}
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}