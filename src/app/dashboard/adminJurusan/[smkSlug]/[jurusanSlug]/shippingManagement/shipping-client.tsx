"use client";

import { useState, useMemo } from "react";
import {
    Search,
    Pencil,
    Trash2,
    Plus,
} from "lucide-react";
import { toast } from "sonner";
import { confirmHapus, tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
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
import { KURIR_MASTER } from "@/lib/constants/kurir";
import { tambahKurir, updateStatusKurir, hapusKurir } from "@/lib/api/kurir-api";
import type { KurirAktifData } from "@/types/interfaces/kurir";

function StatusBadge({ status }: { status: boolean }) {
    return (
        <span
            className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-medium ${status ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                }`}
        >
            {status ? "Aktif" : "Non Aktif"}
        </span>
    );
}

export default function ShippingData({
    initialKurirList,
}: {
    initialKurirList: KurirAktifData[];
}) {
    const [pengirimanData, setPengirimanData] = useState<KurirAktifData[]>(initialKurirList);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // ── Dialog: Tambah Data Pengiriman ──
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addKode, setAddKode] = useState("");
    const [savingAdd, setSavingAdd] = useState(false);

    // ── Dialog: Edit (hanya mengubah status Aktif / Non Aktif) ──
    const [updateItem, setUpdateItem] = useState<KurirAktifData | null>(null);
    const [editStatus, setEditStatus] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);


    // Kurir yang belum ditambahkan oleh jurusan ini
    const kurirBelumDitambah = useMemo(() => {
        const kodeDipakai = new Set(pengirimanData.map((d) => d.kode_kurir));
        return KURIR_MASTER.filter((k) => !kodeDipakai.has(k.kode));
    }, [pengirimanData]);

    const filtered = useMemo(() => {
        return pengirimanData.filter((item) =>
            item.nama_kurir.toLowerCase().includes(search.toLowerCase())
        );
    }, [pengirimanData, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // ── Tambah Data Pengiriman ──
    const openAddDialog = () => {
        setAddKode("");
        setAddDialogOpen(true);
    };

    const closeAddDialog = () => {
        setAddDialogOpen(false);
        setAddKode("");
    };

    const handleSubmitAdd = async () => {
        const kurir = KURIR_MASTER.find((k) => k.kode === addKode);
        if (!kurir) return;

        setSavingAdd(true);
        tampilkanLoading("Menambahkan kurir...");
        try {
            const created = await tambahKurir(kurir.kode, kurir.nama);
            setPengirimanData((prev) => [...prev, created]);
            Swal.close();
            toast.success("Kurir berhasil ditambahkan");
            closeAddDialog();
        } catch (err) {
            Swal.close();
            toast.error(err instanceof Error ? err.message : "Gagal menambah kurir");
        } finally {
            setSavingAdd(false);
        }
    };

    // ── Edit: hanya mengubah status Aktif / Non Aktif ──
    const openUpdateStatus = (item: KurirAktifData) => {
        setUpdateItem(item);
        setEditStatus(item.status);
    };

    const closeUpdateStatus = () => {
        setUpdateItem(null);
    };

    const handleSubmitStatus = async () => {
        if (!updateItem) return;

        setSavingStatus(true);
        tampilkanLoading("Memperbarui status kurir...");
        try {
            const updated = await updateStatusKurir(updateItem.kurir_aktif_id, editStatus);
            setPengirimanData((prev) =>
                prev.map((item) => (item.kurir_aktif_id === updated.kurir_aktif_id ? updated : item))
            );
            Swal.close();
            toast.success("Status kurir berhasil diperbarui");
            closeUpdateStatus();
        } catch (err) {
            Swal.close();
            toast.error(err instanceof Error ? err.message : "Gagal memperbarui status");
        } finally {
            setSavingStatus(false);
        }
    };

    const handleDelete = (item: KurirAktifData) => {
        confirmHapus(item.nama_kurir).then((confirmed) => {
            if (!confirmed) return;
            tampilkanLoading("Menghapus kurir...");
            (async () => {
                try {
                    await hapusKurir(item.kurir_aktif_id);
                    setPengirimanData((prev) => prev.filter((d) => d.kurir_aktif_id !== item.kurir_aktif_id));
                    Swal.close();
                    toast.success("Kurir berhasil dihapus");
                } catch (err) {
                    Swal.close();
                    toast.error(err instanceof Error ? err.message : "Gagal menghapus kurir");
                }
            })();
        });
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
                    <div className="relative flex-1 min-w-22 max-w-sm">
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
                                <TableRow key={item.kurir_aktif_id} className="h-16 hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">
                                        {item.nama_kurir}
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
                                                onClick={() => handleDelete(item)}
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

            {/* ── Dialog Tambah Data Pengiriman ── */}
            <Dialog open={addDialogOpen} onOpenChange={(open) => !open && closeAddDialog()}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl">
                    <div className="px-6 py-6 space-y-4">
                        <Label className="text-sm text-gray-600">Tambah kurir dari RajaOngkir</Label>

                        <Select value={addKode} onValueChange={setAddKode}>
                            <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200 rounded-xl text-sm">
                                <SelectValue placeholder="Pilih kurir..." />
                            </SelectTrigger>
                            <SelectContent>
                                {kurirBelumDitambah.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-gray-400">Semua kurir sudah ditambahkan</div>
                                ) : (
                                    kurirBelumDitambah.map((k) => (
                                        <SelectItem key={k.kode} value={k.kode}>
                                            {k.nama}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>

                        <Button
                            onClick={handleSubmitAdd}
                            disabled={!addKode || savingAdd}
                            className="w-full h-11 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium gap-1.5 disabled:opacity-40"
                        >
                            <Plus className="h-4 w-4" />
                            {savingAdd ? "Menyimpan..." : "Simpan kurir"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Edit (toggle status Aktif / Non Aktif) ── */}
            <Dialog open={!!updateItem} onOpenChange={(open) => !open && closeUpdateStatus()}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl">
                    {updateItem && (
                        <div className="px-6 py-6 space-y-4">
                            <div>
                                <p className="text-xs text-gray-400">Kurir</p>
                                <p className="text-sm font-medium text-gray-700">{updateItem.nama_kurir}</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Status</Label>
                                <Select
                                    value={editStatus ? "Aktif" : "Non Aktif"}
                                    onValueChange={(v) => setEditStatus(v === "Aktif")}
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
                                disabled={savingStatus}
                                className="w-full h-11 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium disabled:opacity-40"
                            >
                                {savingStatus ? "Menyimpan..." : "Simpan Status"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}