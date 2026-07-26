"use client";

import { useState } from "react";
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

import { smkData, type SMKAccount } from "@/lib/data";

const DEFAULT_ROLE = "Admin Pelanggan";
const UPGRADED_ROLE = "Admin SMK";

export default function AccountManagement() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [deleteItem, setDeleteItem] = useState<SMKAccount | null>(null);
    const [nonaktifItem, setNonaktifItem] = useState<SMKAccount | null>(null);
    const [detailItem, setDetailItem] = useState<SMKAccount | null>(null);
    const [editItem, setEditItem] = useState<SMKAccount | null>(null);
    const [nonaktifIds, setNonaktifIds] = useState<number[]>([]);
    // id -> role. Default role dianggap "Admin Pelanggan" jika belum ada di map.
    const [roleOverrides, setRoleOverrides] = useState<Record<number, string>>({});

    const filtered = smkData.filter(
        (item) =>
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.description.toLowerCase().includes(search.toLowerCase()) ||
            item.phoneNumber.includes(search)
    );

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const isNonaktif = (id: number) => nonaktifIds.includes(id);
    const getRole = (id: number) => roleOverrides[id] ?? DEFAULT_ROLE;

    const handleToggleNonaktif = () => {
        if (!nonaktifItem) return;
        if (isNonaktif(nonaktifItem.id)) {
            setNonaktifIds((prev) => prev.filter((id) => id !== nonaktifItem.id));
        } else {
            setNonaktifIds((prev) => [...prev, nonaktifItem.id]);
        }
        setNonaktifItem(null);
    };

    const handleUpgradeRole = () => {
        if (!editItem) return;
        setRoleOverrides((prev) => ({ ...prev, [editItem.id]: UPGRADED_ROLE }));
        setEditItem(null);
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
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">SMK</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Logo</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Deskripsi</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Role</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-right px-15">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
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
                                        <span className="line-clamp-2 text-sm">{item.description}</span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRole(item.id) === UPGRADED_ROLE
                                            ? "bg-blue-100 text-blue-600"
                                            : "bg-gray-100 text-gray-600"
                                            }`}>
                                            {getRole(item.id)}
                                        </span>
                                    </TableCell>
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

                                            {/* Edit Role - hanya aktif jika masih Admin Pelanggan */}
                                            {getRole(item.id) === DEFAULT_ROLE && (
                                                <button
                                                    onClick={() => setEditItem(item)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors"
                                                    title="Jadikan Admin SMK"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            )}

                                            {/* Nonaktifkan / Aktifkan */}
                                            <button
                                                onClick={() => setNonaktifItem(item)}
                                                className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${isNonaktif(item.id)
                                                    ? "bg-green-50 hover:bg-green-100 text-green-500"
                                                    : "bg-orange-50 hover:bg-orange-100 text-orange-500"
                                                    }`}
                                                title={isNonaktif(item.id) ? "Aktifkan" : "Nonaktifkan"}
                                            >
                                                <PowerOff className="h-3.5 w-3.5" />
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
                        <Button variant="outline" onClick={() => setEditItem(null)}>Batal</Button>
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={handleUpgradeRole}
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
                            {nonaktifItem && isNonaktif(nonaktifItem.id) ? "Aktifkan Akun SMK" : "Nonaktifkan Akun SMK"}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500 py-2">
                        {nonaktifItem && isNonaktif(nonaktifItem.id) ? (
                            <>
                                Apakah Anda yakin ingin mengaktifkan kembali akun{" "}
                                <span className="font-semibold text-gray-700">{nonaktifItem?.name}</span>?
                                Akun akan dapat diakses kembali.
                            </>
                        ) : (
                            <>
                                Apakah Anda yakin ingin menonaktifkan akun{" "}
                                <span className="font-semibold text-gray-700">{nonaktifItem?.name}</span>?
                                Akun tidak akan dapat diakses selama dinonaktifkan.
                            </>
                        )}
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNonaktifItem(null)}>Batal</Button>
                        <Button
                            className={`text-white ${nonaktifItem && isNonaktif(nonaktifItem.id)
                                ? "bg-green-500 hover:bg-green-600"
                                : "bg-orange-500 hover:bg-orange-600"
                                }`}
                            onClick={handleToggleNonaktif}
                        >
                            {nonaktifItem && isNonaktif(nonaktifItem.id) ? "Aktifkan" : "Nonaktifkan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Detail Akun */}
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
                                    <p className="font-semibold text-gray-800">{detailItem.name}</p>
                                    <p className="text-sm text-gray-500 font-mono">{detailItem.phoneNumber}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <p className="text-xs font-medium uppercase text-gray-400">ID Akun</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-700">#{detailItem.id}</p>
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <p className="text-xs font-medium uppercase text-gray-400">Status</p>
                                    <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isNonaktif(detailItem.id)
                                        ? "bg-red-100 text-red-600"
                                        : "bg-green-100 text-green-600"
                                        }`}>
                                        {isNonaktif(detailItem.id) ? "Nonaktif" : "Aktif"}
                                    </span>
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 col-span-2">
                                    <p className="text-xs font-medium uppercase text-gray-400">Role</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-700">{getRole(detailItem.id)}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-sm font-medium text-gray-700">Deskripsi</p>
                                <p className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm leading-6 text-gray-600">
                                    {detailItem.description || "-"}
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

            {/* Dialog Hapus */}
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