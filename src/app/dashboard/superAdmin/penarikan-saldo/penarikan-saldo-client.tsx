"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { tampilkanLoading, confirmAksi } from "@/lib/utils/alert";
import {
    Search,
    Eye,
    CheckCircle2,
    XCircle,
    Loader2,
    GraduationCap,
    Building2,
    User,
    CreditCard,
    Calendar as CalendarIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PaginationIconsOnly from "@/components/pagination/page";
import type { PenarikanSaldoRow } from "@/lib/data/penarikan-saldo";
import { formatRupiah } from "@/lib/utils/format";

type Status = "Pending" | "Diproses" | "Selesai" | "Ditolak";


function StatusBadge({ status }: { status: Status }) {
    const styles: Record<Status, string> = {
        Pending: "bg-amber-100 text-amber-600",
        Diproses: "bg-sky-100 text-sky-600",
        Selesai: "bg-emerald-100 text-emerald-600",
        Ditolak: "bg-red-100 text-red-600",
    };
    return (
        <span className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-medium ${styles[status]}`}>
            {status}
        </span>
    );
}

export default function PenarikanSaldoClient({
    initialData,
}: {
    initialData: PenarikanSaldoRow[];
}) {
    const router = useRouter();
    const data = initialData;

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("semua");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [detailItem, setDetailItem] = useState<PenarikanSaldoRow | null>(null);

    const filtered = useMemo(() => {
        return data.filter((item) => {
            const matchSearch =
                item.jurusan.toLowerCase().includes(search.toLowerCase()) ||
                item.smk.toLowerCase().includes(search.toLowerCase()) ||
                item.atasNama.toLowerCase().includes(search.toLowerCase());
            const matchStatus =
                statusFilter === "semua" || item.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [data, search, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handleUbahStatus = async (item: PenarikanSaldoRow, statusBaru: Status) => {
        const title =
            statusBaru === "Selesai"
                ? "Tandai penarikan ini SELESAI (pastikan sudah ditransfer di Midtrans)?"
                : statusBaru === "Ditolak"
                    ? "Tolak pengajuan penarikan ini? Saldo jurusan akan kembali otomatis."
                    : `Ubah status menjadi "${statusBaru}"?`;

        const confirmed = await confirmAksi({ title });
        if (!confirmed) return;

        tampilkanLoading();
        try {
            const res = await fetch(`/api/penarikan-saldo/${item.penarikanId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: statusBaru }),
            });
            Swal.close();
            if (!res.ok) {
                const err = await res.json();
                toast.error(err.message || "Gagal mengubah status");
                return;
            }
            toast.success("Status penarikan berhasil diperbarui");
            router.refresh();
        } catch {
            Swal.close();
            toast.error("Terjadi kesalahan, coba lagi");
        }
    };

    return (
        <div className="space-y-6 px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Penarikan Saldo
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Keuangan</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Penarikan Saldo</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <Card className="rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-50 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cari jurusan / SMK / atas nama"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9 bg-gray-50 border-gray-200 rounded-full text-sm"
                            />
                        </div>

                        <Select
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-36 h-9 text-sm bg-gray-50 border-gray-200 rounded-lg">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="semua">Semua Status</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Diproses">Diproses</SelectItem>
                                <SelectItem value="Selesai">Selesai</SelectItem>
                                <SelectItem value="Ditolak">Ditolak</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Tanggal</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Jurusan</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">SMK</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 text-right whitespace-nowrap">Nominal (Rp)</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Metode</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">No. Rekening/HP</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 whitespace-nowrap">Atas Nama</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 text-center whitespace-nowrap">Status</TableHead>
                                <TableHead className="font-semibold text-gray-600 px-6 text-center whitespace-nowrap">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                                        Tidak ada data ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((item) => (
                                    <TableRow key={item.penarikanId} className="h-16 hover:bg-blue-50/30 transition-colors">
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.tanggal}</TableCell>
                                        <TableCell className="font-medium text-gray-700 py-4 px-6 whitespace-nowrap">{item.jurusan}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.smk}</TableCell>
                                        <TableCell className="font-medium text-gray-700 py-4 px-6 text-right whitespace-nowrap">
                                            {formatRupiah(item.nominal)}
                                        </TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.metode}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.nomorRekening}</TableCell>
                                        <TableCell className="text-gray-600 py-4 px-6 whitespace-nowrap">{item.atasNama}</TableCell>
                                        <TableCell className="py-4 px-6">
                                            <div className="flex justify-center">
                                                <StatusBadge status={item.status} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => setDetailItem(item)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                {item.status === "Pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUbahStatus(item, "Diproses")}
                                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-500 transition-colors"
                                                            title="Tandai Diproses"
                                                        >
                                                            <Loader2 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUbahStatus(item, "Ditolak")}
                                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                                                            title="Tolak"
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                                {item.status === "Diproses" && (
                                                    <button
                                                        onClick={() => handleUbahStatus(item, "Selesai")}
                                                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-500 transition-colors"
                                                        title="Tandai Selesai"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                />
            </Card>

            {/* ══════════════ Dialog: Detail Penarikan Saldo ══════════════ */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-sky-50/60 shrink-0">
                        <DialogTitle className="text-sm font-semibold">Detail Penarikan Saldo</DialogTitle>
                    </DialogHeader>

                    {detailItem && (
                        <div className="overflow-y-auto">
                            {/* Nominal + status */}
                            <div className="px-5 pt-5 pb-4 text-center bg-linear-to-b from-sky-50/70 to-transparent">
                                <p className="text-xs text-gray-400 mb-1">Nominal Penarikan</p>
                                <p className="text-2xl font-bold text-sky-600">
                                    {formatRupiah(detailItem.nominal)}
                                </p>
                                <div className="flex justify-center mt-2">
                                    <StatusBadge status={detailItem.status} />
                                </div>
                            </div>

                            <Separator />

                            {/* Info pengajuan */}
                            <div className="px-5 py-4 space-y-3">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                    Informasi Pengajuan
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-start gap-2">
                                        <GraduationCap className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] text-gray-400">Jurusan</p>
                                            <p className="text-sm font-medium text-gray-700">{detailItem.jurusan}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Building2 className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] text-gray-400">SMK</p>
                                            <p className="text-sm font-medium text-gray-700">{detailItem.smk}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <User className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] text-gray-400">Diajukan Oleh</p>
                                            <p className="text-sm font-medium text-gray-700">{detailItem.diajukanOleh}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CalendarIcon className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] text-gray-400">Tanggal</p>
                                            <p className="text-sm font-medium text-gray-700">{detailItem.tanggal}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Rekening tujuan */}
                            <div className="px-5 py-4 space-y-2">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                    Rekening Tujuan
                                </p>
                                <div className="rounded-xl bg-linear-to-r from-sky-500 to-sky-400 text-white p-4 space-y-2 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        <span className="text-xs text-sky-50">{detailItem.metode}</span>
                                    </div>
                                    <p className="text-lg font-semibold tracking-wide">
                                        {detailItem.nomorRekening}
                                    </p>
                                    <p className="text-xs text-sky-50 uppercase">{detailItem.atasNama}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}