"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { confirmAksi, tampilkanLoading } from "@/lib/utils/alert";
import { Star, Trash2, Inbox, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

import PaginationIconsOnly from "@/components/pagination/page";
import { getPesanList, bulkUpdatePesan, updatePesanById } from "@/lib/api/kontak";
import { PesanApi } from "@/types/interfaces/kontak";
import { getSelectedPesanId, clearSelectedPesanId } from "@/lib/pesan-selection";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabType = "pesan" | "favorite" | "sampah";
type FilterType = "Semua" | "Dibaca" | "Belum Dibaca";

interface Message {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    preview: string;
    body: string;
    date: string;
    isRead: boolean;
    isFavorite: boolean;
    isDeleted: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTanggal(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function mapToMessage(p: PesanApi): Message {
    return {
        id: p.pesan_id,
        name: p.nama,
        email: p.email,
        phone: p.phone,
        preview: p.pesan.length > 40 ? `${p.pesan.slice(0, 40)}...` : p.pesan,
        body: p.pesan,
        date: formatTanggal(p.createdAt),
        isRead: p.isRead,
        isFavorite: p.isFavorite,
        isDeleted: p.isDeleted,
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IncomingContact() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>("pesan");
    const [selected, setSelected] = useState<string[]>([]);
    const [filter, setFilter] = useState<FilterType>("Semua");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [viewItem, setViewItem] = useState<Message | null>(null);

    useEffect(() => {
        loadMessages();
    }, []);

    async function loadMessages() {
        setLoading(true);
        try {
            const data = await getPesanList();
            const mapped = data.map(mapToMessage);
            setMessages(mapped);

            // Jika datang dari tombol "Read more" di widget dashboard
            const pendingId = getSelectedPesanId();
            if (pendingId) {
                const found = mapped.find((m) => m.id === pendingId);
                if (found) {
                    setViewItem(found);
                    if (!found.isRead) {
                        setMessages((prev) =>
                            prev.map((m) => (m.id === found.id ? { ...m, isRead: true } : m))
                        );
                        updatePesanById(found.id, { isRead: true }).catch(() => { });
                    }
                }
                clearSelectedPesanId();
            }
        } catch (error) {
            toast.error("Gagal memuat pesan", {
                description: error instanceof Error ? error.message : "Coba lagi",
            });
        } finally {
            setLoading(false);
        }
    }

    // ── Filter by tab ──
    const byTab = messages.filter((m) => {
        if (activeTab === "pesan") return !m.isDeleted;
        if (activeTab === "favorite") return m.isFavorite && !m.isDeleted;
        if (activeTab === "sampah") return m.isDeleted;
        return true;
    });

    // ── Filter by read status ──
    const filtered = byTab.filter((m) => {
        if (filter === "Dibaca") return m.isRead;
        if (filter === "Belum Dibaca") return !m.isRead;
        return true;
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // ── Actions ──
    const toggleSelect = (id: string) =>
        setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

    const selectAll = () => {
        const ids = paginated.map((m) => m.id);
        const allSelected = ids.every((id) => selected.includes(id));
        setSelected(allSelected ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
    };

    const markAsRead = async () => {
        const ids = [...selected];
        setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, isRead: true } : m)));
        setSelected([]);
        tampilkanLoading("Menandai pesan sebagai dibaca..."); // Swal: loading selama request
        try {
            await bulkUpdatePesan(ids, "markRead");
            Swal.close();
            toast.success(`${ids.length} pesan ditandai sebagai dibaca`);
        } catch {
            Swal.close();
            toast.error("Gagal menandai dibaca");
            loadMessages();
        }
    };

    const deleteSelected = async () => {
        const ids = [...selected];
        const konfirmasi = await confirmAksi({
            title: "Pindahkan pesan ke Sampah?",
            text: `${ids.length} pesan yang dipilih akan dipindahkan ke Sampah.`,
            icon: "warning",
            confirmText: "Ya, pindahkan",
            confirmColor: "#ef4444", // red-500
        }); // 1. Swal: minta izin dulu
        if (!konfirmasi) return;

        setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, isDeleted: true } : m)));
        setSelected([]);
        tampilkanLoading("Memindahkan pesan ke Sampah..."); // Swal: loading selama request
        try {
            await bulkUpdatePesan(ids, "delete");
            Swal.close();
            toast.success("Pesan dipindahkan ke sampah"); // 2. toast: status sukses
        } catch {
            Swal.close();
            toast.error("Gagal menghapus pesan"); // 2. toast: status gagal
            loadMessages();
        }
    };

    const toggleFavorite = async (id: string) => {
        const target = messages.find((m) => m.id === id);
        if (!target) return;
        const nextFavorite = !target.isFavorite;

        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isFavorite: nextFavorite } : m)));
        try {
            await updatePesanById(id, { isFavorite: nextFavorite });
        } catch {
            toast.error("Gagal memperbarui favorite");
            loadMessages();
        }
    };

    const openView = async (msg: Message) => {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)));
        setViewItem({ ...msg, isRead: true });

        if (!msg.isRead) {
            try {
                await updatePesanById(msg.id, { isRead: true });
            } catch {
                // silent, non-critical
            }
        }
    };

    const counts = {
        pesan: messages.filter((m) => !m.isDeleted).length,
        favorite: messages.filter((m) => m.isFavorite && !m.isDeleted).length,
        sampah: messages.filter((m) => m.isDeleted).length,
    };

    const tabs: { key: TabType; label: string; icon: React.ReactNode; count: number; color: string }[] = [
        { key: "pesan", label: "Pesan Masuk", icon: <Inbox className="h-4 w-4" />, count: counts.pesan, color: "bg-blue-500" },
        { key: "favorite", label: "Favorite", icon: <Star className="h-4 w-4" />, count: counts.favorite, color: "bg-yellow-400" },
        { key: "sampah", label: "Sampah", icon: <Trash2 className="h-4 w-4" />, count: counts.sampah, color: "bg-red-400" },
    ];

    const allPageSelected = paginated.length > 0 && paginated.every((m) => selected.includes(m.id));

    return (
        <div className="space-y-6 px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Kontak Masuk
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Manajemen</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Kontak Masuk</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
                <div className="w-52 shrink-0 border-r border-gray-100 p-4 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setPage(1); setSelected([]); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.key
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={activeTab === tab.key ? "text-blue-500" : "text-gray-400"}>
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </div>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${tab.color} text-white min-w-24 text-center`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAll}
                            className="rounded-lg text-xs border-gray-200"
                        >
                            {allPageSelected ? "Batal Semua" : "Pilih Semua"}
                        </Button>
                        <Button
                            size="sm"
                            onClick={markAsRead}
                            disabled={selected.length === 0}
                            className="rounded-lg text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-none"
                        >
                            Tandai Dibaca
                        </Button>
                        <Button
                            size="sm"
                            onClick={deleteSelected}
                            disabled={selected.length === 0}
                            className="rounded-lg text-xs bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 shadow-none"
                        >
                            Hapus
                        </Button>

                        <div className="ml-auto flex items-center gap-2">
                            <Select value={filter} onValueChange={(v) => { setFilter(v as FilterType); setPage(1); }}>
                                <SelectTrigger className="h-8 w-32 text-xs border-gray-200 rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(["Semua", "Dibaca", "Belum Dibaca"] as FilterType[]).map((f) => (
                                        <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex-1 divide-y divide-gray-100">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Memuat pesan...
                            </div>
                        ) : paginated.length === 0 ? (
                            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                                Tidak ada pesan
                            </div>
                        ) : (
                            paginated.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-blue-50/30 transition-colors cursor-pointer ${!msg.isRead ? "bg-blue-50/20" : ""}`}
                                    onClick={() => openView(msg)}
                                >
                                    <div
                                        onClick={(e) => { e.stopPropagation(); toggleSelect(msg.id); }}
                                        className={`h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${selected.includes(msg.id)
                                            ? "bg-blue-500 border-blue-500"
                                            : "border-gray-300 bg-white"
                                            }`}
                                    >
                                        {selected.includes(msg.id) && (
                                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(msg.id); }}
                                        className="shrink-0 text-gray-300 hover:text-yellow-400 transition-colors"
                                    >
                                        <Star className={`h-4 w-4 ${msg.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                                    </button>

                                    {/* Indikator titik belum dibaca */}
                                    <span
                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${!msg.isRead ? "bg-blue-500" : "bg-transparent"}`}
                                    />

                                    <div className="flex-1 grid grid-cols-5 gap-3 items-center min-w-0">
                                        <p className={`text-sm truncate ${!msg.isRead ? "font-semibold text-gray-900" : "font-normal text-gray-400"}`}>
                                            {msg.name}
                                        </p>
                                        <p className={`text-sm truncate ${!msg.isRead ? "font-semibold text-gray-800" : "font-normal text-gray-400"}`}>
                                            {msg.email}
                                        </p>
                                        <p className={`text-sm truncate ${!msg.isRead ? "font-semibold text-gray-800" : "font-normal text-gray-400"}`}>
                                            {msg.phone || "Tidak ada nomor"}
                                        </p>
                                        <p className={`text-sm truncate ${!msg.isRead ? "font-medium text-gray-700" : "font-normal text-gray-400"}`}>
                                            {msg.preview}
                                        </p>
                                        <p className={`text-xs text-right ${!msg.isRead ? "font-semibold text-gray-600" : "font-normal text-gray-400"}`}>
                                            {msg.date}
                                        </p>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); openView(msg); }}
                                        className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors"
                                        title="Lihat Pesan"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
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

            <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Detail Pesan</DialogTitle>
                    </DialogHeader>
                    {viewItem && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                                    {viewItem.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{viewItem.name}</p>
                                    <p className="text-xs text-gray-500">{viewItem.phone}</p>
                                    <p className="text-xs text-gray-500">{viewItem.email}</p>
                                </div>
                                <p className="ml-auto text-xs text-gray-400">{viewItem.date}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-sm text-gray-700 leading-relaxed">{viewItem.body}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewItem(null)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}