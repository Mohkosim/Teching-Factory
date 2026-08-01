"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye, Trash2, School, PowerOff, Pencil } from "lucide-react";
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
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PaginationIconsOnly from "@/components/pagination/page";
import { toast } from "sonner";

import { SMKAccount } from "@/types/interfaces/accountAdmin"

const ROLE_LABELS: Record<SMKAccount["role"], string> = {
    User: "Admin Pelanggan",
    SuperAdmin: "Admin Utama",
    AdminSMK: "Admin SMK",
    AdminJurusan: "Admin Jurusan",
};

const PAGE_SIZE_DEFAULT = 10;

export default function AccountManagement({
    initialData,
}: {
    initialData: SMKAccount[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [accounts, setAccounts] = useState<SMKAccount[]>(initialData);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    const [detailItem, setDetailItem] = useState<SMKAccount | null>(null);
    const [editItem, setEditItem] = useState<SMKAccount | null>(null);
    const [nonaktifItem, setNonaktifItem] = useState<SMKAccount | null>(null);
    const [deleteItem, setDeleteItem] = useState<SMKAccount | null>(null);

    // ── Filtering ──
    const filtered = useMemo(() => {
        if (!search.trim()) return accounts;
        const q = search.toLowerCase();
        return accounts.filter((item) => {
            const name = item.name.toLowerCase();
            const email = item.email.toLowerCase();
            return name.includes(q) || email.includes(q);
        });
    }, [accounts, search]);

    // ── Pagination ──
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    // ── Handlers ──
    const handleUpgradeRole = () => {
        if (!editItem) return;
        startTransition(async () => {
            try {
                const res = await fetch(`/api/account/${editItem.user_id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "upgrade-role" }),
                });
                const json = await res.json();

                if (!res.ok) {
                    toast.error(json.message ?? "Gagal mengubah role");
                    return;
                }

                setAccounts((prev) =>
                    prev.map((acc) =>
                        acc.user_id === editItem.user_id ? { ...acc, role: "AdminSMK" } : acc
                    )
                );
                toast.success(json.message ?? "Role berhasil diubah");
                setEditItem(null);
                router.refresh();
            } catch (error) {
                console.error(error);
                toast.error("Terjadi kesalahan saat mengubah role");
            }
        });
    };

    const handleToggleNonaktif = () => {
        if (!nonaktifItem) return;
        startTransition(async () => {
            try {
                const res = await fetch(`/api/account/${nonaktifItem.user_id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "toggle-status" }),
                });
                const json = await res.json();

                if (!res.ok) {
                    toast.error(json.message ?? "Gagal mengubah status akun");
                    return;
                }

                setAccounts((prev) =>
                    prev.map((acc) =>
                        acc.user_id === nonaktifItem.user_id
                            ? { ...acc, isActive: !acc.isActive }
                            : acc
                    )
                );
                toast.success(json.message ?? "Status akun berhasil diubah");
                setNonaktifItem(null);
                router.refresh();
            } catch (error) {
                console.error(error);
                toast.error("Terjadi kesalahan saat mengubah status akun");
            }
        });
    };

    const handleDelete = () => {
        if (!deleteItem) return;
        startTransition(async () => {
            try {
                const res = await fetch(`/api/account/${deleteItem.user_id}`, {
                    method: "DELETE",
                });
                const json = await res.json();

                if (!res.ok) {
                    toast.error(json.message ?? "Gagal menghapus akun");
                    return;
                }

                setAccounts((prev) => prev.filter((acc) => acc.user_id !== deleteItem.user_id));
                toast.success(json.message ?? "Akun berhasil dihapus");
                setDeleteItem(null);
                router.refresh();
            } catch (error) {
                console.error(error);
                toast.error("Terjadi kesalahan saat menghapus akun");
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
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 bg-gray-50 border-gray-200 rounded-xl text-sm"
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">SMK</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Logo</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Alamat</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Role</TableHead>
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
                                    key={item.user_id}
                                    className={`transition-colors h-16 ${!item.isActive ? "bg-gray-50/60 opacity-60" : "hover:bg-blue-50/30"
                                        }`}
                                >
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm">
                                            <School className="h-5 w-5 text-blue-500" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 max-w-xs py-4 px-6">
                                        <span className="line-clamp-2 text-sm">{item.alamat ?? "-"}</span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.role === "AdminSMK"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {ROLE_LABELS[item.role]}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!item.isActive
                                                    ? "bg-red-100 text-red-600"
                                                    : "bg-green-100 text-green-600"
                                                }`}
                                        >
                                            {!item.isActive ? "Nonaktif" : "Aktif"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => setDetailItem(item)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors"
                                                title="Lihat Detail"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>

                                            {item.role === "User" && (
                                                <button
                                                    onClick={() => setEditItem(item)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors"
                                                    title="Jadikan Admin SMK"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setNonaktifItem(item)}
                                                className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${!item.isActive
                                                        ? "bg-green-50 hover:bg-green-100 text-green-500"
                                                        : "bg-orange-50 hover:bg-orange-100 text-orange-500"
                                                    }`}
                                                title={!item.isActive ? "Aktifkan" : "Nonaktifkan"}
                                            >
                                                <PowerOff className="h-3.5 w-3.5" />
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

                <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => {
                        setPageSize(s);
                        setPage(1);
                    }}
                />
            </div>

            {/* ── Dialog Edit Role ── */}
            <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Jadikan Admin SMK</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500 py-2">
                        Apakah Anda yakin ingin mengubah role akun{" "}
                        <span className="font-semibold text-gray-700">{editItem?.name}</span> dari{" "}
                        <span className="font-medium text-gray-700">Admin Pelanggan</span> menjadi{" "}
                        <span className="font-medium text-blue-600">Admin SMK</span>?
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditItem(null)}>
                            Batal
                        </Button>
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={handleUpgradeRole}
                            disabled={isPending}
                        >
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Nonaktifkan / Aktifkan ── */}
            <Dialog open={!!nonaktifItem} onOpenChange={() => setNonaktifItem(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {nonaktifItem && !nonaktifItem.isActive ? "Aktifkan Akun SMK" : "Nonaktifkan Akun SMK"}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500 py-2">
                        {nonaktifItem && !nonaktifItem.isActive ? (
                            <>
                                Apakah Anda yakin ingin mengaktifkan kembali akun{" "}
                                <span className="font-semibold text-gray-700">{nonaktifItem?.name}</span>? Akun akan
                                dapat diakses kembali.
                            </>
                        ) : (
                            <>
                                Apakah Anda yakin ingin menonaktifkan akun{" "}
                                <span className="font-semibold text-gray-700">{nonaktifItem?.name}</span>? Akun tidak
                                akan dapat diakses selama dinonaktifkan.
                            </>
                        )}
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNonaktifItem(null)}>
                            Batal
                        </Button>
                        <Button
                            className={`text-white ${nonaktifItem && !nonaktifItem.isActive
                                    ? "bg-green-500 hover:bg-green-600"
                                    : "bg-orange-500 hover:bg-orange-600"
                                }`}
                            onClick={handleToggleNonaktif}
                            disabled={isPending}
                        >
                            {nonaktifItem && !nonaktifItem.isActive ? "Aktifkan" : "Nonaktifkan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Detail Akun ── */}
            <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detail Akun SMK</DialogTitle>
                    </DialogHeader>
                    {detailItem && (
                        <div className="space-y-5 py-2">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm">
                                    <School className="h-7 w-7 text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-800">
                                        {detailItem.name}
                                    </p>
                                    <p className="text-sm text-gray-500 font-mono">
                                        {detailItem.phone ?? "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <p className="text-xs font-medium uppercase text-gray-400">ID Akun</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-700 truncate">
                                        #{detailItem.user_id}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <p className="text-xs font-medium uppercase text-gray-400">Status</p>
                                    <span
                                        className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${!detailItem.isActive
                                                ? "bg-red-100 text-red-600"
                                                : "bg-green-100 text-green-600"
                                            }`}
                                    >
                                        {!detailItem.isActive ? "Nonaktif" : "Aktif"}
                                    </span>
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 col-span-2">
                                    <p className="text-xs font-medium uppercase text-gray-400">Email</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-700 truncate">
                                        {detailItem.email}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 col-span-2">
                                    <p className="text-xs font-medium uppercase text-gray-400">Role</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-700">
                                        {ROLE_LABELS[detailItem.role]}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-sm font-medium text-gray-700">Alamat</p>
                                <p className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm leading-6 text-gray-600">
                                    {detailItem.alamat || "-"}
                                </p>
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
                        <Button variant="outline" onClick={() => setDeleteItem(null)}>
                            Batal
                        </Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}