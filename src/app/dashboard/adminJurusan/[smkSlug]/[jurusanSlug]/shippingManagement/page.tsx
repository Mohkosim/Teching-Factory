"use client";

import { useState, useMemo } from "react";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    Plus,
    AlertTriangle,
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
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import PaginationIconsOnly from "@/components/pagination/page";

// ── Tipe status kurir ──
// Aktif     : kurir tampil sebagai opsi pengiriman di halaman pelanggan (Produk Jurusan)
// Non Aktif : kurir disembunyikan, tidak bisa dipilih pelanggan
type StatusKurir = "Aktif" | "Non Aktif";

// ── Tipe data pengiriman ──
interface PengirimanItem {
    id: number;
    kurir: string;
    status: StatusKurir;
}

// Daftar kurir yang didukung RajaOngkir.
// TODO: kalau endpoint daftar kurir RajaOngkir sudah tersedia, ganti list statis ini
// dengan hasil fetch supaya selalu sinkron dengan kurir yang aktif di akun.
const kurirOptions = ["JNE", "J&T", "SiCepat", "AnterAja", "Pos Indonesia"];

// ── Dummy data, ganti dengan fetch dari API kalau sudah siap ──
const initialPengirimanData: PengirimanItem[] = [
    { id: 1, kurir: "JNE", status: "Non Aktif" },
    { id: 2, kurir: "JNE", status: "Aktif" },
    { id: 3, kurir: "J&T", status: "Aktif" },
];

// ── Styling badge status ──
function StatusBadge({ status }: { status: StatusKurir }) {
    const styles: Record<StatusKurir, string> = {
        Aktif: "bg-emerald-50 text-emerald-600",
        "Non Aktif": "bg-red-50 text-red-500",
    };

    return (
        <span
            className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-medium ${styles[status]}`}
        >
            {status}
        </span>
    );
}

export default function ShippingData() {
    const [pengirimanData, setPengirimanData] = useState<PengirimanItem[]>(initialPengirimanData);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // ── Dialog: Tambah Data Pengiriman ──
    // Menambahkan kurir agar bisa tampil di Produk Jurusan.
    // Statusnya otomatis "Non Aktif" sehingga belum terlihat oleh pelanggan
    // sampai admin mengaktifkannya lewat Edit.
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addKurir, setAddKurir] = useState("");

    // ── Dialog: Edit (hanya mengubah status Aktif / Non Aktif) ──
    const [updateItem, setUpdateItem] = useState<PengirimanItem | null>(null);
    const [editStatus, setEditStatus] = useState<StatusKurir>("Non Aktif");

    // ── Dialog: Konfirmasi Hapus ──
    const [deleteItem, setDeleteItem] = useState<PengirimanItem | null>(null);

    const filtered = useMemo(() => {
        return pengirimanData.filter((item) =>
            item.kurir.toLowerCase().includes(search.toLowerCase())
        );
    }, [pengirimanData, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // ── Tambah Data Pengiriman ──
    const openAddDialog = () => {
        setAddKurir("");
        setAddDialogOpen(true);
    };

    const closeAddDialog = () => {
        setAddDialogOpen(false);
        setAddKurir("");
    };

    const handleSubmitAdd = () => {
        if (!addKurir) return;
        // TODO: POST ke backend (Laravel API) untuk menyimpan data pengiriman baru
        const newItem: PengirimanItem = {
            id: Math.max(0, ...pengirimanData.map((i) => i.id)) + 1,
            kurir: addKurir,
            status: "Non Aktif",
        };
        setPengirimanData((prev) => [...prev, newItem]);
        closeAddDialog();
    };

    // ── Edit: hanya mengubah status Aktif / Non Aktif, kurir tidak diubah dari sini ──
    const openUpdateStatus = (item: PengirimanItem) => {
        setUpdateItem(item);
        setEditStatus(item.status);
    };

    const closeUpdateStatus = () => {
        setUpdateItem(null);
    };

    const handleSubmitStatus = () => {
        if (!updateItem) return;
        // TODO: PATCH ke backend (Laravel API) untuk mengubah status kurir
        setPengirimanData((prev) =>
            prev.map((item) =>
                item.id === updateItem.id ? { ...item, status: editStatus } : item
            )
        );
        closeUpdateStatus();
    };

    // ── Hapus data yang salah input ──
    const openDeleteConfirm = (item: PengirimanItem) => setDeleteItem(item);
    const closeDeleteConfirm = () => setDeleteItem(null);

    const handleConfirmDelete = () => {
        if (!deleteItem) return;
        // TODO: DELETE ke backend (Laravel API)
        setPengirimanData((prev) => prev.filter((item) => item.id !== deleteItem.id));
        closeDeleteConfirm();
    };

    return (
        <div className="space-y-6 px-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Data Pengiriman
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Manajemen</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Data pengiriman</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar: Search + Tambah Data */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari kurir"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 bg-gray-50 border-gray-200 rounded-full text-sm"
                        />
                    </div>

                    <Button
                        onClick={openAddDialog}
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Data
                    </Button>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="font-semibold text-gray-600 px-6">Kurir</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-center px-6">Status</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-center px-6">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-12 text-gray-400">
                                    Tidak ada data ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((item) => (
                                <TableRow key={item.id} className="h-16 hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">
                                        {item.kurir}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex justify-center">
                                            <StatusBadge status={item.status} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                onClick={() => openUpdateStatus(item)}
                                                className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg h-8 px-3 text-xs gap-1.5"
                                            >
                                                <Pencil className="h-3 w-3" />
                                                Edit
                                            </Button>
                                            <button
                                                onClick={() => openDeleteConfirm(item)}
                                                title="Hapus data"
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
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

            {/* ── Dialog Tambah Data Pengiriman (kurir dari RajaOngkir) ── */}
            <Dialog open={addDialogOpen} onOpenChange={(open) => !open && closeAddDialog()}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl">
                    <div className="px-6 py-6 space-y-4">
                        <Label className="text-sm text-gray-600">Tambah kurir dari RajaOngkir</Label>

                        <Select value={addKurir} onValueChange={setAddKurir}>
                            <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200 rounded-xl text-sm">
                                <SelectValue placeholder="Pilih kurir..." />
                            </SelectTrigger>
                            <SelectContent>
                                {kurirOptions.map((k) => (
                                    <SelectItem key={k} value={k}>
                                        {k}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            onClick={handleSubmitAdd}
                            disabled={!addKurir}
                            className="w-full h-11 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium gap-1.5 disabled:opacity-40"
                        >
                            <Plus className="h-4 w-4" />
                            Simpan kurir
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Edit (hanya toggle status Aktif / Non Aktif) ── */}
            <Dialog open={!!updateItem} onOpenChange={(open) => !open && closeUpdateStatus()}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl">
                    {updateItem && (
                        <div className="px-6 py-6 space-y-4">
                            <div>
                                <p className="text-xs text-gray-400">Kurir</p>
                                <p className="text-sm font-medium text-gray-700">{updateItem.kurir}</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Status</Label>
                                <Select
                                    value={editStatus}
                                    onValueChange={(v) => setEditStatus(v as StatusKurir)}
                                >
                                    <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200 rounded-xl text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Aktif">Aktif</SelectItem>
                                        <SelectItem value="Non Aktif">Non Aktif</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-400">
                                    Aktif akan menampilkan kurir ini ke pelanggan. Non Aktif menyembunyikannya.
                                </p>
                            </div>

                            <Button
                                onClick={handleSubmitStatus}
                                className="w-full h-11 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium"
                            >
                                Simpan Status
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Dialog Konfirmasi Hapus ── */}
            <Dialog open={!!deleteItem} onOpenChange={(open) => !open && closeDeleteConfirm()}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
                    <div className="px-6 py-5 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Hapus data pengiriman?</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Data kurir{" "}
                                    <span className="font-medium text-gray-700">{deleteItem?.kurir}</span> akan
                                    dihapus permanen. Gunakan ini untuk membetulkan data yang salah input.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                onClick={closeDeleteConfirm}
                                variant="outline"
                                className="rounded-lg h-9 text-sm"
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleConfirmDelete}
                                className="bg-red-500 hover:bg-red-600 text-white rounded-lg h-9 px-5 text-sm"
                            >
                                Hapus
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}