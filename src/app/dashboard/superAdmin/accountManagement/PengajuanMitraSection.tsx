"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { School, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { confirmAksi, tampilkanLoading } from "@/lib/utils/alert";
import type { PengajuanMitraItem } from "@/types/interfaces/accountAdmin";

function formatTanggal(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function PengajuanMitraSection({
    initialData,
    onApproved,
}: {
    initialData: PengajuanMitraItem[];
    onApproved?: (item: PengajuanMitraItem) => void;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [items, setItems] = useState<PengajuanMitraItem[]>(initialData);
    // Ikuti data terbaru dari server setelah router.refresh() (tanpa useEffect)
    const [prevInitialData, setPrevInitialData] = useState(initialData);
    if (initialData !== prevInitialData) {
        setPrevInitialData(initialData);
        setItems(initialData);
    }
    const [collapsed, setCollapsed] = useState(false);

    const proses = async (item: PengajuanMitraItem, action: "approve" | "reject") => {
        let catatanAdmin: string | undefined;

        if (action === "approve") {
            const konfirmasi = await confirmAksi({
                title: "Setujui pengajuan ini?",
                text: `"${item.namaSekolah}" akan aktif sebagai Admin SMK. Pastikan sudah menghubungi ${item.namaPenanggungJawab} (${item.noHpPenanggungJawab}) untuk verifikasi.`,
                icon: "question",
                confirmText: "Ya, setujui",
                confirmColor: "#22c55e",
            });
            if (!konfirmasi) return;
        } else {
            const { value, isConfirmed } = await Swal.fire({
                title: "Tolak pengajuan ini?",
                input: "text",
                inputLabel: "Alasan penolakan (opsional)",
                inputPlaceholder: "Contoh: NPSN tidak sesuai data resmi",
                showCancelButton: true,
                confirmButtonText: "Ya, tolak",
                confirmButtonColor: "#ef4444",
                cancelButtonText: "Batal",
                reverseButtons: true,
            });
            if (!isConfirmed) return;
            catatanAdmin = (value as string | undefined)?.trim() || undefined;
        }

        startTransition(async () => {
            tampilkanLoading(action === "approve" ? "Menyetujui pengajuan..." : "Menolak pengajuan...");
            try {
                const res = await fetch(`/api/pengajuan-mitra/${item.pengajuan_id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action, catatanAdmin }),
                });
                const json = await res.json();
                Swal.close();

                if (!res.ok) {
                    toast.error(json.message ?? "Gagal memproses pengajuan");
                    return;
                }

                setItems((prev) => prev.filter((p) => p.pengajuan_id !== item.pengajuan_id));
                if (action === "approve") onApproved?.(item);
                toast.success(
                    action === "approve"
                        ? `"${item.namaSekolah}" sekarang jadi Admin SMK`
                        : "Pengajuan ditolak"
                );
                router.refresh();
            } catch (error) {
                Swal.close();
                console.error(error);
                toast.error("Terjadi kesalahan saat memproses pengajuan");
            }
        });
    };

    if (items.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
            <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="w-full flex items-center justify-between gap-3 p-5 bg-amber-50/60 hover:bg-amber-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <School className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-gray-800">
                        Pengajuan Mitra SMK menunggu persetujuan
                    </span>
                    <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-amber-500 text-white text-xs font-bold">
                        {items.length}
                    </span>
                </div>
                {collapsed ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                )}
            </button>

            {!collapsed && (
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="font-semibold text-gray-600 px-6">Nama Sekolah</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">NPSN</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Penanggung Jawab</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">No. HP</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Akun Pendaftar</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Tanggal</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-right px-6">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.pengajuan_id}>
                                <TableCell className="px-6 font-medium text-gray-800">{item.namaSekolah}</TableCell>
                                <TableCell className="px-6">{item.npsn}</TableCell>
                                <TableCell className="px-6">{item.namaPenanggungJawab}</TableCell>
                                <TableCell className="px-6">{item.noHpPenanggungJawab}</TableCell>
                                <TableCell className="px-6">
                                    <div className="flex flex-col">
                                        <span className="text-gray-800">{item.pendaftar.name}</span>
                                        <span className="text-xs text-gray-400">{item.pendaftar.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 text-gray-500">{formatTanggal(item.createdAt)}</TableCell>
                                <TableCell className="px-6">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            size="sm"
                                            disabled={isPending}
                                            onClick={() => proses(item, "approve")}
                                            className="bg-green-500 hover:bg-green-600 text-white"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1" /> Setujui
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={isPending}
                                            onClick={() => proses(item, "reject")}
                                            className="border-red-300 text-red-600 hover:bg-red-50"
                                        >
                                            <XCircle className="h-4 w-4 mr-1" /> Tolak
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
