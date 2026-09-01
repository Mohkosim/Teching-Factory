"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye, Trash2, School, Power, Pencil } from "lucide-react";
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
import Swal from "sweetalert2";
import { confirmAksi, confirmHapus, tampilkanLoading } from "@/lib/utils/alert";

import { SMKAccount } from "@/types/interfaces/accountAdmin"

const ROLE_LABELS: Record<SMKAccount["role"], string> = {
    User: "User",
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
    const handleUpgradeRole = async (item: SMKAccount) => {
        const konfirmasi = await confirmAksi({
            title: "Jadikan Admin SMK?",
            text: `Role akun "${item.name}" akan diubah dari Admin Pelanggan menjadi Admin SMK.`,
            icon: "question",
            confirmText: "Ya, jadikan admin",
        });
        if (!konfirmasi) return;

        startTransition(async () => {
            tampilkanLoading("Menyimpan perubahan role...");
            try {
                const res = await fetch(`/api/account/${item.user_id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "upgrade-role" }),
                });
                const json = await res.json();
                Swal.close();

                if (!res.ok) {
                    toast.error(json.message ?? "Gagal mengubah role");
                    return;
                }

                setAccounts((prev) =>
                    prev.map((acc) =>
                        acc.user_id === item.user_id ? { ...acc, role: "AdminSMK" } : acc
                    )
                );
                toast.success(json.message ?? "Role berhasil diubah");
                router.refresh();
            } catch (error) {
                Swal.close();
                console.error(error);
                toast.error("Terjadi kesalahan saat mengubah role");
            }
        });
    };

    const handleToggleNonaktif = async (item: SMKAccount) => {
        const akanDiaktifkan = !item.isActive;
        const konfirmasi = await confirmAksi({
            title: akanDiaktifkan ? "Aktifkan Akun SMK?" : "Nonaktifkan Akun SMK?",
            text: akanDiaktifkan
                ? `Akun "${item.name}" akan diaktifkan kembali dan dapat diakses.`
                : `Akun "${item.name}" tidak akan dapat diakses selama dinonaktifkan.`,
            icon: "warning",
            confirmText: akanDiaktifkan ? "Ya, aktifkan" : "Ya, nonaktifkan",
            confirmColor: akanDiaktifkan ? "#22c55e" : "#f97316", // green-500 / orange-500
        });
        if (!konfirmasi) return;

        startTransition(async () => {
            tampilkanLoading(akanDiaktifkan ? "Mengaktifkan akun..." : "Menonaktifkan akun...");
            try {
                const res = await fetch(`/api/account/${item.user_id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "toggle-status" }),
                });
                const json = await res.json();
                Swal.close();

                if (!res.ok) {
                    toast.error(json.message ?? "Gagal mengubah status akun");
                    return;
                }

                setAccounts((prev) =>
                    prev.map((acc) =>
                        acc.user_id === item.user_id
                            ? { ...acc, isActive: !acc.isActive }
                            : acc
                    )
                );
                toast.success(json.message ?? "Status akun berhasil diubah");
                router.refresh();
            } catch (error) {
                Swal.close();
                console.error(error);
                toast.error("Terjadi kesalahan saat mengubah status akun");
            }
        });
    };

    const handleDelete = async (item: SMKAccount) => {
        const konfirmasi = await confirmHapus(item.name);
        if (!konfirmasi) return;

        startTransition(async () => {
            tampilkanLoading("Menghapus akun...");
            try {
                const res = await fetch(`/api/account/${item.user_id}`, {
                    method: "DELETE",
                });
                const json = await res.json();
                Swal.close();

                if (!res.ok) {
                    toast.error(json.message ?? "Gagal menghapus akun");
                    return;
                }

                setAccounts((prev) => prev.filter((acc) => acc.user_id !== item.user_id));
                toast.success(json.message ?? "Akun berhasil dihapus");
                router.refresh();
            } catch (error) {
                Swal.close();
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
                            <TableHead className="font-semibold text-gray-600 px-6">Phone</TableHead>
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
                                    className={`transition-colors h-16 ${!item.isActive ? "bg-gray-50/60" : "hover:bg-blue-50/30"}`}
                                >
                                    <TableCell className={`text-gray-500 font-medium py-4 px-6 ${!item.isActive ? "opacity-60" : ""}`}>
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className={`font-medium text-gray-700 py-4 px-6 ${!item.isActive ? "opacity-60" : ""}`}>
                                        {item.name}
                                    </TableCell>
                                    <TableCell className={`py-4 px-6 ${!item.isActive ? "opacity-60" : ""}`}>
                                        <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm overflow-hidden">
                                            {item.img ? (
                                                <Image
                                                    src={item.img}
                                                    alt={item.name}
                                                    width={40}
                                                    height={40}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <School className="h-5 w-5 text-blue-500" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className={`text-gray-500 max-w-xs py-4 px-6 ${!item.isActive ? "opacity-60" : ""}`}>
                                        <span className="line-clamp-2 text-sm">{item.alamat ?? "-"}</span>
                                    </TableCell>
                                    <TableCell className={`text-gray-500 max-w-xs py-4 px-6 ${!item.isActive ? "opacity-60" : ""}`}>
                                        <span className="line-clamp-2 text-sm">{item.phone ?? "-"}</span>
                                    </TableCell>
                                    <TableCell className={`py-4 px-6 ${!item.isActive ? "opacity-60" : ""}`}>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.role === "AdminSMK" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {ROLE_LABELS[item.role]}
                                        </span>
                                    </TableCell>
                                    <TableCell className={`py-4 px-6 ${!item.isActive ? "opacity-60" : ""}`}>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!item.isActive ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                                                }`}
                                        >
                                            {!item.isActive ? "Nonaktif" : "Aktif"}
                                        </span>
                                    </TableCell>
                                    {/* Cell Aksi TIDAK diberi opacity-60 — supaya tombol PowerOff tetap terlihat normal */}
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => setDetailItem(item)}
                                                disabled={!item.isActive}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-50"
                                                title="Lihat Detail"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>

                                            {item.role === "User" && (
                                                <button
                                                    onClick={() => handleUpgradeRole(item)}
                                                    disabled={isPending || !item.isActive}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-50"
                                                    title="Jadikan Admin SMK"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleToggleNonaktif(item)}
                                                disabled={isPending}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-500 transition-colors"
                                                title={!item.isActive ? "Aktifkan" : "Nonaktifkan"}
                                            >
                                                <Power className="h-3.5 w-3.5" />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(item)}
                                                disabled={isPending || !item.isActive}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-50"
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

            {/* ── Dialog Detail Akun (bukan aksi, tetap pakai shadcn Dialog) ── */}
            <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detail Akun SMK</DialogTitle>
                    </DialogHeader>
                    {detailItem && (
                        <div className="space-y-5 py-2">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm overflow-hidden">
                                    {detailItem.img ? (
                                        <Image
                                            src={detailItem.img}
                                            alt={detailItem.name}
                                            width={56}
                                            height={56}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <School className="h-7 w-7 text-blue-500" />
                                    )}
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
                                    <p className="text-xs font-medium uppercase text-gray-400">Penangung Jawab</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-700 truncate">
                                        {detailItem.kepala_sekolah || "-"}
                                    </p>
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
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 col-span-2">
                                    <p className="text-xs font-medium uppercase text-gray-400">Alamat</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-700">
                                        {detailItem.alamat || "-"}
                                    </p>
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
        </div>
    );
}