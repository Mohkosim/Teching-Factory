"use client";

import { useState } from "react";
import { Search, Eye, Pencil, Trash2, School, Plus, Package, HandHeart } from "lucide-react";
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

import { smkData, type SMKAccount } from "@/lib/data";

export default function accountManagement() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [deleteItem, setDeleteItem] = useState<SMKAccount | null>(null);
    const [detailItem, setDetailItem] = useState<SMKAccount | null>(null);
    const [nonaktifIds, setNonaktifIds] = useState<number[]>([]);
    const [nonaktifItem, setNonaktifItem] = useState<SMKAccount | null>(null);

    // Data lokal agar hasil tambah/update bisa langsung terlihat di tabel
    const [data, setData] = useState<SMKAccount[]>(smkData);

    // ── State untuk dialog Tambah Jurusan ──
    const [openAdd, setOpenAdd] = useState(false);
    const [addForm, setAddForm] = useState({
        name: "",
        username: "",
        email: "",
        phoneNumber: "",
    });

    // ── State untuk dialog Update Data ──
    const [editItem, setEditItem] = useState<SMKAccount | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        phoneNumber: "",
    });

    const filtered = data.filter(
        (item) =>
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.description.toLowerCase().includes(search.toLowerCase()) ||
            item.phoneNumber.includes(search)
    );

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // ── Handler Tambah Jurusan ──
    const handleOpenAdd = () => {
        setAddForm({ name: "", username: "", email: "", phoneNumber: "" });
        setOpenAdd(true);
    };

    const handleSubmitAdd = () => {
        if (!addForm.name.trim() || !addForm.username.trim() || !addForm.email.trim()) return;

        const newItem: SMKAccount = {
            id: Math.max(0, ...data.map((d) => d.id)) + 1,
            name: addForm.name,
            username: addForm.username,
            email: addForm.email,
        } as SMKAccount;

        setData((prev) => [newItem, ...prev]);
        setOpenAdd(false);
    };

    // ── Handler Update Data ──
    const handleOpenEdit = (item: SMKAccount) => {
        setEditItem(item);
        setEditForm({
            name: item.name,
            description: item.description,
            phoneNumber: item.phoneNumber,
        });
    };

    const handleSubmitEdit = () => {
        if (!editItem) return;

        setData((prev) =>
            prev.map((d) =>
                d.id === editItem.id
                    ? { ...d, ...editForm }
                    : d
            )
        );
        setEditItem(null);
    };

    const isNonaktif = (id: number) => nonaktifIds.includes(id);

    const handleToggleNonaktif = () => {
        if (!nonaktifItem) return;
        if (isNonaktif(nonaktifItem.id)) {
            // Aktifkan kembali
            setNonaktifIds((prev) => prev.filter((id) => id !== nonaktifItem.id));
        } else {
            // Nonaktifkan
            setNonaktifIds((prev) => [...prev, nonaktifItem.id]);
        }
        setNonaktifItem(null);
    };

    return (
        <div className="space-y-6 px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Manajemen Akun
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Manajemen</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Manajemen Akun</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Table Toolbar */}
                <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-100">
                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 bg-gray-50 border-gray-200 rounded-xl text-sm"
                        />
                    </div>

                    <Button
                        onClick={handleOpenAdd}
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Jurusan
                    </Button>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Jurusan</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Logo</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Email</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Nomer Wa</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-right px-15">Aksi</TableHead>
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
                                <TableRow
                                    key={item.id}
                                    className={`transition-colors h-16 ${isNonaktif(item.id) ? "bg-gray-50/60 opacity-60" : "hover:bg-blue-50/30"}`}
                                >
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">{item.name}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm">
                                            <School className="h-5 w-5 text-blue-500" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 max-w-xs py-4 px-6">
                                        <span className="line-clamp-2 text-sm">{item.email}</span>
                                    </TableCell>
                                    <TableCell className="text-gray-600 font-mono text-sm py-4 px-6">{item.phoneNumber}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isNonaktif(item.id)
                                            ? "bg-red-100 text-red-600"
                                            : "bg-green-100 text-green-600"
                                            }`}>
                                            {isNonaktif(item.id) ? "Nonaktif" : "Aktif"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {/* Lihat Detail */}
                                            <button
                                                onClick={() => setDetailItem(item)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors"
                                                title="Lihat Detail"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>

                                            {/* Update Data */}
                                            <button
                                                onClick={() => handleOpenEdit(item)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors"
                                                title="Update Data"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>

                                            {/* Hapus */}
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
                <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </div>

            {/* ── Dialog Tambah Jurusan ── */}
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Jurusan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="add-name">Nama Jurusan</Label>
                            <Input
                                id="add-name"
                                value={addForm.name}
                                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Contoh: Rekayasa Perangkat Lunak"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="add-username">Username</Label>
                            <Input
                                id="add-username"
                                value={addForm.username}
                                onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
                                placeholder="Contoh: admin_rpl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="add-email">Email</Label>
                            <Input
                                id="add-email"
                                type="email"
                                value={addForm.email}
                                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                                placeholder="contoh@email.com"
                            />
                            <p className="text-xs text-gray-400">
                                Password akan digenerate otomatis dan dikirimkan ke email ini.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOpenAdd(false)}>Batal</Button>
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={handleSubmitAdd}
                        >
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Update Data ── */}
            <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Data Jurusan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-name">Nama Jurusan</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-description">Deskripsi</Label>
                            <Textarea
                                id="edit-description"
                                value={editForm.description}
                                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-phone">Nomor WA</Label>
                            <Input
                                id="edit-phone"
                                value={editForm.phoneNumber}
                                onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditItem(null)}>Batal</Button>
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={handleSubmitEdit}
                        >
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Detail Akun ── */}
            <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detail Akun Jurusan</DialogTitle>
                    </DialogHeader>
                    {detailItem && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm">
                                    <School className="h-7 w-7 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{detailItem.name}</p>
                                    <p className="text-sm text-gray-500 font-mono">{detailItem.email}</p>
                                    <p className="text-sm text-gray-500 font-mono">{detailItem.phoneNumber}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Deskripsi</Label>
                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    {detailItem.description || "-"}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between bg-blue-50/40 rounded-2xl p-4 shadow-sm">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {detailItem.totalProduk ?? 0}
                                        </p>
                                        <p className="text-sm text-gray-500">Produk</p>
                                    </div>
                                    <div className="h-11 w-11 rounded-full bg-sky-400 flex items-center justify-center shadow-sm">
                                        <Package className="h-5 w-5 text-white" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-blue-50/40 rounded-2xl p-4 shadow-sm">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {detailItem.totalJasa ?? 0}
                                        </p>
                                        <p className="text-sm text-gray-500">Jasa</p>
                                    </div>
                                    <div className="h-11 w-11 rounded-full bg-sky-400 flex items-center justify-center shadow-sm">
                                        <HandHeart className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailItem(null)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Hapus ── */}
            <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Akun SMK</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500 py-2">
                        Apakah Anda yakin ingin menghapus akun{" "}
                        <span className="font-semibold text-gray-700">{deleteItem?.name}</span>? Tindakan ini tidak
                        dapat dibatalkan.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white"
                            onClick={() => {
                                setData((prev) => prev.filter((d) => d.id !== deleteItem?.id));
                                setDeleteItem(null);
                            }}
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
