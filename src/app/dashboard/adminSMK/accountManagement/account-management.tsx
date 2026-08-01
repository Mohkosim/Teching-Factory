"use client";

import { useState, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, Eye, Pencil, Trash2, School, Plus, Package, HandHeart, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PaginationIconsOnly from "@/components/pagination/page";
import FormField from "@/components/auth/FormField";
import PasswordInput from "@/components/auth/PasswordInput";

import { addJurusanSchema, type AddJurusanForm } from "@/lib/validations/createAccount";
import {
    createJurusanAccount,
    updateJurusanAccount,
    toggleJurusanStatus,
    deleteJurusanAccount,
} from "@/lib/api/jurusan-api";
import type { JurusanAccount } from "@/types/interfaces/accountAdmin";

export default function AccountManagement({ initialData }: { initialData: JurusanAccount[] }) {
    const [data, setData] = useState<JurusanAccount[]>(initialData);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isPending, startTransition] = useTransition();

    const [openAdd, setOpenAdd] = useState(false);
    const [editItem, setEditItem] = useState<JurusanAccount | null>(null);
    const [editForm, setEditForm] = useState({ nama_jurusan: "", deskripsi: "", kepala_jurusan: "" });
    const [detailItem, setDetailItem] = useState<JurusanAccount | null>(null);
    const [nonaktifItem, setNonaktifItem] = useState<JurusanAccount | null>(null);
    const [deleteItem, setDeleteItem] = useState<JurusanAccount | null>(null);

    const {
        register: registerAdd,
        handleSubmit: handleSubmitAddForm,
        reset: resetAddForm,
        formState: { errors: addErrors, isSubmitting: isAddSubmitting },
    } = useForm<AddJurusanForm>({ resolver: zodResolver(addJurusanSchema) });

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return data.filter(
            (item) =>
                item.nama_jurusan.toLowerCase().includes(q) ||
                item.email.toLowerCase().includes(q)
        );
    }, [data, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handleOpenAdd = () => {
        resetAddForm();
        setOpenAdd(true);
    };

    const onSubmitAdd = (values: AddJurusanForm) => {
        startTransition(async () => {
            try {
                const res = await createJurusanAccount(values);
                setData((prev) => [...prev, res.data]);
                toast.success("Akun jurusan berhasil ditambahkan");
                setOpenAdd(false);
            } catch (err) {
                if (err instanceof Error && err.message === "EmailTaken") {
                    toast.error("Email sudah digunakan akun lain");
                } else if (err instanceof Error && err.message === "UsernameTaken") {
                    toast.error("Username sudah digunakan akun lain");
                } else {
                    toast.error("Gagal menambahkan akun jurusan");
                }
            }
        });
    };

    const handleOpenEdit = (item: JurusanAccount) => {
        setEditForm({
            nama_jurusan: item.nama_jurusan,
            deskripsi: item.deskripsi ?? "",
            kepala_jurusan: item.kepala_jurusan ?? "",
        });
        setEditItem(item);
    };

    const handleSubmitEdit = () => {
        if (!editItem) return;
        startTransition(async () => {
            try {
                await updateJurusanAccount(editItem.jurusan_id, editForm);
                setData((prev) => prev.map((it) => (it.jurusan_id === editItem.jurusan_id ? { ...it, ...editForm } : it)));
                toast.success("Data jurusan berhasil diperbarui");
                setEditItem(null);
            } catch {
                toast.error("Gagal memperbarui data jurusan");
            }
        });
    };

    const handleToggleNonaktif = () => {
        if (!nonaktifItem) return;
        startTransition(async () => {
            try {
                await toggleJurusanStatus(nonaktifItem.jurusan_id);
                setData((prev) =>
                    prev.map((it) => (it.jurusan_id === nonaktifItem.jurusan_id ? { ...it, isActive: !it.isActive } : it))
                );
                toast.success(nonaktifItem.isActive ? "Akun berhasil dinonaktifkan" : "Akun berhasil diaktifkan");
                setNonaktifItem(null);
            } catch {
                toast.error("Gagal mengubah status akun");
            }
        });
    };

    const handleDelete = () => {
        if (!deleteItem) return;
        startTransition(async () => {
            try {
                await deleteJurusanAccount(deleteItem.jurusan_id);
                setData((prev) => prev.filter((it) => it.jurusan_id !== deleteItem.jurusan_id));
                toast.success("Akun jurusan berhasil dihapus");
                setDeleteItem(null);
            } catch {
                toast.error("Gagal menghapus akun jurusan");
            }
        });
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

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                                <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                                    Tidak ada data ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((item, idx) => (
                                <TableRow
                                    key={item.jurusan_id}
                                    className={`transition-colors h-16 ${!item.isActive ? "bg-gray-50/60 opacity-60" : "hover:bg-blue-50/30"}`}
                                >
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">{item.nama_jurusan}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm">
                                            <School className="h-5 w-5 text-blue-500" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 max-w-xs py-4 px-6">
                                        <span className="line-clamp-2 text-sm">{item.email}</span>
                                    </TableCell>
                                    <TableCell className="text-gray-600 font-mono text-sm py-4 px-6">{item.phoneNumber ?? "-"}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!item.isActive ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                                            {item.isActive ? "Aktif" : "Nonaktif"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => setDetailItem(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors" title="Lihat Detail">
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => handleOpenEdit(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors" title="Update Data">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => setNonaktifItem(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-500 transition-colors" title={item.isActive ? "Nonaktifkan" : "Aktifkan"}>
                                                <Power className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => setDeleteItem(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Hapus">
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

            {/* Tambah Jurusan */}
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Tambah Jurusan</DialogTitle></DialogHeader>

                    <form onSubmit={handleSubmitAddForm(onSubmitAdd)} className="space-y-4 py-2" noValidate>
                        <FormField label="Nama Jurusan" htmlFor="add-nama_jurusan" error={addErrors.nama_jurusan?.message}>
                            <Input
                                id="add-nama_jurusan"
                                placeholder="Contoh: Rekayasa Perangkat Lunak"
                                {...registerAdd("nama_jurusan")}
                            />
                        </FormField>

                        <FormField label="Username" htmlFor="add-username" error={addErrors.username?.message}>
                            <Input
                                id="add-username"
                                placeholder="Contoh: admin_rpl"
                                {...registerAdd("username")}
                            />
                        </FormField>

                        <FormField label="E-mail" htmlFor="add-email" error={addErrors.email?.message}>
                            <Input
                                id="add-email"
                                type="email"
                                placeholder="contoh@email.com"
                                {...registerAdd("email")}
                            />
                        </FormField>

                        <FormField label="Kata Sandi" htmlFor="add-password" error={addErrors.password?.message}>
                            <PasswordInput
                                id="add-password"
                                hasError={!!addErrors.password}
                                {...registerAdd("password")}
                            />
                        </FormField>
                        <p className="text-xs text-gray-400 -mt-2">
                            Sampaikan password ini kepada kepala jurusan yang bersangkutan.
                        </p>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpenAdd(false)}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                                disabled={isAddSubmitting}
                            >
                                {isAddSubmitting ? "Menyimpan..." : "Simpan"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Update Data */}
            <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Update Data Jurusan</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-name">Nama Jurusan</Label>
                            <Input id="edit-name" value={editForm.nama_jurusan}
                                onChange={(e) => setEditForm((f) => ({ ...f, nama_jurusan: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-description">Deskripsi</Label>
                            <Textarea id="edit-description" value={editForm.deskripsi}
                                onChange={(e) => setEditForm((f) => ({ ...f, deskripsi: e.target.value }))} rows={3} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-kepala">Kepala Jurusan</Label>
                            <Input id="edit-kepala" value={editForm.kepala_jurusan}
                                onChange={(e) => setEditForm((f) => ({ ...f, kepala_jurusan: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditItem(null)}>Batal</Button>
                        <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={handleSubmitEdit} disabled={isPending}>
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail */}
            <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Detail Akun Jurusan</DialogTitle></DialogHeader>
                    {detailItem && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm">
                                    <School className="h-7 w-7 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{detailItem.nama_jurusan}</p>
                                    <p className="text-sm text-gray-500 font-mono">{detailItem.email}</p>
                                    <p className="text-sm text-gray-500 font-mono">{detailItem.phoneNumber ?? "-"}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Deskripsi</Label>
                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    {detailItem.deskripsi || "-"}
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between bg-blue-50/40 rounded-2xl p-4 shadow-sm">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-800">{detailItem.totalProduk ?? 0}</p>
                                        <p className="text-sm text-gray-500">Produk</p>
                                    </div>
                                    <div className="h-11 w-11 rounded-full bg-sky-400 flex items-center justify-center shadow-sm">
                                        <Package className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-blue-50/40 rounded-2xl p-4 shadow-sm">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-800">{detailItem.totalJasa ?? 0}</p>
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
                        <Button variant="outline" onClick={() => setDetailItem(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Toggle Aktif/Nonaktif */}
            <Dialog open={!!nonaktifItem} onOpenChange={() => setNonaktifItem(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{nonaktifItem?.isActive ? "Nonaktifkan" : "Aktifkan"} Akun</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500 py-2">
                        Apakah Anda yakin ingin {nonaktifItem?.isActive ? "menonaktifkan" : "mengaktifkan"} akun{" "}
                        <span className="font-semibold text-gray-700">{nonaktifItem?.nama_jurusan}</span>?
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNonaktifItem(null)}>Batal</Button>
                        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleToggleNonaktif} disabled={isPending}>
                            Ya, {nonaktifItem?.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hapus */}
            <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Hapus Akun SMK</DialogTitle></DialogHeader>
                    <p className="text-sm text-gray-500 py-2">
                        Apakah Anda yakin ingin menghapus akun{" "}
                        <span className="font-semibold text-gray-700">{deleteItem?.nama_jurusan}</span>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
                        <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={isPending}>
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}