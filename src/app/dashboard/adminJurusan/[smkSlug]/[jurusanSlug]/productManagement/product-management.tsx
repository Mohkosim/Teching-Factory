"use client";

import { useRef, useState, useMemo, useTransition } from "react";
import { Search, Eye, Pencil, Trash2, Plus, Package, ImagePlus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { confirmHapus, tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PaginationIconsOnly from "@/components/pagination/page";

import { produkSchema, type ProdukForm } from "@/lib/validations/produk";
import { simpanVarianSchema } from "@/lib/validations/varian";
import { createProduk, updateProduk, deleteProduk, uploadProdukImages } from "@/lib/api/produk-api";
import { getVarianProduk, simpanVarianProduk, uploadVarianImage } from "@/lib/api/varian-api";
import type { ProdukItem } from "@/types/interfaces/produk";
import { formatRupiah, formatNominalInput } from "@/lib/utils/format";
import type { GetVarianResponse, VarianGrupRecord } from "@/types/interfaces/varian";

const emptyForm: ProdukForm = {
    nama_produk: "",
    deskripsi: "",
    harga: 0,
    status: "Tersedia",
    stok: 0,
    kondisi: "Baru",
    fotos: [],
};

const statusOptions = ["Semua", "Tersedia", "Habis", "Nonaktif"] as const;

interface VarianOpsiState {
    nama: string;
    gambar?: string;
}
interface VarianGrupState {
    nama: string;
    opsi: VarianOpsiState[];
}
interface VarianKombinasiState {
    opsi_nama: string[];
    harga: number;
    stok: number;
    gambar?: string;
}

const emptyVarianGrup: VarianGrupState = { nama: "", opsi: [{ nama: "" }] };

function cartesianProduct(arrays: string[][]): string[][] {
    return arrays.reduce<string[][]>(
        (acc, curr) => acc.flatMap((combo) => curr.map((item) => [...combo, item])),
        [[]]
    );
}

function isKontenBerubah(
    original: ProdukItem,
    parsed: ProdukForm,
    fotosBaru: string[]
): boolean {
    return (
        original.nama_produk !== parsed.nama_produk ||
        (original.deskripsi ?? "") !== (parsed.deskripsi ?? "") ||
        original.harga !== parsed.harga ||
        (original.kondisi ?? "") !== (parsed.kondisi ?? "") ||
        JSON.stringify(original.fotos) !== JSON.stringify(fotosBaru)
    );
}

export default function ProductManagement({ initialData }: { initialData: ProdukItem[] }) {
    const [products, setProducts] = useState<ProdukItem[]>(initialData);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("Semua");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isPending, startTransition] = useTransition();

    const [detailItem, setDetailItem] = useState<ProdukItem | null>(null);
    const [detailVarian, setDetailVarian] = useState<GetVarianResponse | null>(null);
    const [loadingDetailVarian, setLoadingDetailVarian] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [formData, setFormData] = useState<ProdukForm>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showFullDesc, setShowFullDesc] = useState(false);

    const [existingFotos, setExistingFotos] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── State varian ──
    const [varianAktif, setVarianAktif] = useState(false);
    const [varianGrup, setVarianGrup] = useState<VarianGrupState[]>([emptyVarianGrup]);
    const [varianKombinasi, setVarianKombinasi] = useState<VarianKombinasiState[]>([]);
    const [loadingVarian, setLoadingVarian] = useState(false);

    const gambarInputRef = useRef<HTMLInputElement>(null);
    const [gambarTargetIdx, setGambarTargetIdx] = useState<number | null>(null);
    const [uploadingGambarIdx, setUploadingGambarIdx] = useState<number | null>(null);

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    const MAX_FILES = 5;

    const filtered = useMemo(() => {
        return products.filter((item) => {
            const q = search.toLowerCase();
            const matchSearch =
                item.nama_produk.toLowerCase().includes(q) ||
                (item.deskripsi ?? "").toLowerCase().includes(q);
            const matchStatus = statusFilter === "Semua" || getStatusTampil(item) === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [products, search, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const resetVarianState = () => {
        setVarianAktif(false);
        setVarianGrup([emptyVarianGrup]);
        setVarianKombinasi([]);
    };

    const openCreateForm = () => {
        setFormMode("create");
        setFormData(emptyForm);
        setEditingId(null);
        setExistingFotos([]);
        setNewFiles([]);
        setNewPreviews([]);
        resetVarianState();
        setFormOpen(true);
    };

    const openEditForm = async (item: ProdukItem) => {
        setFormMode("edit");
        setEditingId(item.produk_id);
        setFormData({
            nama_produk: item.nama_produk,
            deskripsi: item.deskripsi ?? "",
            harga: item.harga,
            status: item.status,
            stok: item.stok,
            kondisi: item.kondisi ?? "Baru",
            fotos: item.fotos,
        });
        setExistingFotos(item.fotos);
        setNewFiles([]);
        setNewPreviews([]);
        resetVarianState();
        setFormOpen(true);

        setLoadingVarian(true);
        try {
            const data: GetVarianResponse = await getVarianProduk(item.produk_id);
            if (data.grup.length > 0) {
                const grupState: VarianGrupState[] = data.grup.map((g) => ({
                    nama: g.nama,
                    opsi: g.opsi.map((o) => ({ nama: o.nama, gambar: o.gambar ?? undefined })),
                }));

                const kombinasiState: VarianKombinasiState[] = data.kombinasi.map((k) => ({
                    opsi_nama: data.grup.map((g: VarianGrupRecord) => {
                        const match = k.opsi.find((ko) => ko.opsi.grup_id === g.grup_id);
                        return match?.opsi.nama ?? "";
                    }),
                    harga: k.harga,
                    stok: k.stok,
                    gambar: k.gambar ?? undefined,
                }));

                setVarianAktif(true);
                setVarianGrup(grupState);
                setVarianKombinasi(kombinasiState);
            }
        } catch (err) {
            console.error("Gagal memuat varian:", err);
        } finally {
            setLoadingVarian(false);
        }
    };

    const closeForm = () => {
        setFormOpen(false);
        setFormData(emptyForm);
        setEditingId(null);
        resetVarianState();
    };

    const handleFormChange = <K extends keyof ProdukForm>(field: K, value: ProdukForm[K]) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };

            if (field === "stok") {
                const stokBaru = value as number;
                if (stokBaru <= 0) {
                    next.status = "Habis";
                } else if (prev.stok <= 0 && prev.status === "Habis") {
                    next.status = "Tersedia";
                }
            }

            return next as ProdukForm;
        });
    };

    function getStatusTampil(item: Pick<ProdukItem, "stok" | "status">) {
        return item.stok === 0 ? "Habis" : item.status;
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const totalCount = existingFotos.length + newFiles.length + files.length;
        if (totalCount > MAX_FILES) {
            toast.error(`Maksimal ${MAX_FILES} gambar per produk`);
            return;
        }

        for (const file of files) {
            if (!file.type.startsWith("image/")) {
                toast.error(`${file.name} bukan file gambar`);
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`${file.name} melebihi 2MB`);
                return;
            }
        }

        setNewFiles((prev) => [...prev, ...files]);
        setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
        e.target.value = "";
    };

    const removeExistingFoto = (idx: number) => {
        setExistingFotos((prev) => prev.filter((_, i) => i !== idx));
    };

    const removeNewFoto = (idx: number) => {
        URL.revokeObjectURL(newPreviews[idx]);
        setNewFiles((prev) => prev.filter((_, i) => i !== idx));
        setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
    };

    const openDetail = async (item: ProdukItem) => {
        setDetailItem(item);
        setActiveImageIndex(0);
        setShowFullDesc(false);
        setDetailVarian(null);

        setLoadingDetailVarian(true);
        try {
            const data = await getVarianProduk(item.produk_id);
            setDetailVarian(data.grup.length > 0 ? data : null);
        } catch (err) {
            console.error("Gagal memuat varian produk:", err);
            setDetailVarian(null);
        } finally {
            setLoadingDetailVarian(false);
        }
    };

    const goPrevImage = () => {
        if (!detailItem) return;
        setActiveImageIndex((i) => (i === 0 ? detailItem.fotos.length - 1 : i - 1));
    };

    const goNextImage = () => {
        if (!detailItem) return;
        setActiveImageIndex((i) => (i === detailItem.fotos.length - 1 ? 0 : i + 1));
    };

    // ── Handler varian ──
    const addVarianGrup = () => {
        if (varianGrup.length >= 3) {
            toast.error("Maksimal 3 grup varian per produk");
            return;
        }
        setVarianGrup((prev) => [...prev, { nama: "", opsi: [{ nama: "" }] }]);
    };

    const removeVarianGrup = (idx: number) => {
        setVarianGrup((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateVarianGrupNama = (idx: number, nama: string) => {
        setVarianGrup((prev) => prev.map((g, i) => (i === idx ? { ...g, nama } : g)));
    };

    const addVarianOpsi = (grupIdx: number) => {
        setVarianGrup((prev) =>
            prev.map((g, i) => (i === grupIdx ? { ...g, opsi: [...g.opsi, { nama: "" }] } : g))
        );
    };

    const removeVarianOpsi = (grupIdx: number, opsiIdx: number) => {
        setVarianGrup((prev) =>
            prev.map((g, i) =>
                i === grupIdx ? { ...g, opsi: g.opsi.filter((_, j) => j !== opsiIdx) } : g
            )
        );
    };

    const updateVarianOpsiNama = (grupIdx: number, opsiIdx: number, nama: string) => {
        setVarianGrup((prev) =>
            prev.map((g, i) =>
                i === grupIdx
                    ? { ...g, opsi: g.opsi.map((o, j) => (j === opsiIdx ? { ...o, nama } : o)) }
                    : g
            )
        );
    };

    const grupValid = useMemo(() => {
        const grupSeen = new Set<string>();
        const result: { nama: string; opsi: { nama: string }[] }[] = [];

        for (const g of varianGrup) {
            const namaGrup = g.nama.trim();
            if (namaGrup.length === 0 || grupSeen.has(namaGrup)) continue;

            const opsiSeen = new Set<string>();
            const opsiUnik: { nama: string }[] = [];
            for (const o of g.opsi) {
                const namaOpsi = o.nama.trim();
                if (namaOpsi.length === 0 || opsiSeen.has(namaOpsi)) continue;
                opsiSeen.add(namaOpsi);
                opsiUnik.push({ nama: namaOpsi });
            }

            if (opsiUnik.length === 0) continue;
            grupSeen.add(namaGrup);
            result.push({ nama: namaGrup, opsi: opsiUnik });
        }

        return result;
    }, [varianGrup]);

    const generateKombinasi = () => {
        if (grupValid.length === 0) {
            toast.error("Isi minimal 1 grup varian dengan nama & minimal 1 opsi dulu");
            setVarianKombinasi([]);
            return;
        }

        const opsiPerGrup = grupValid.map((g) => g.opsi.map((o) => o.nama));
        const kombinasiBaru = cartesianProduct(opsiPerGrup).map((opsi_nama) => {
            const existing = varianKombinasi.find(
                (k) => JSON.stringify(k.opsi_nama) === JSON.stringify(opsi_nama)
            );
            return existing ?? { opsi_nama, harga: 0, stok: 0 };
        });

        setVarianKombinasi(kombinasiBaru);
        toast.success(`${kombinasiBaru.length} kombinasi varian dibuat`);
    };

    const updateKombinasiHarga = (idx: number, harga: number) => {
        setVarianKombinasi((prev) => prev.map((k, i) => (i === idx ? { ...k, harga } : k)));
    };

    const updateKombinasiStok = (idx: number, stok: number) => {
        setVarianKombinasi((prev) => prev.map((k, i) => (i === idx ? { ...k, stok } : k)));
    };

    const removeKombinasi = (idx: number) => {
        setVarianKombinasi((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmitForm = () => {
        if (existingFotos.length + newFiles.length === 0) {
            toast.error("Minimal 1 foto produk");
            return;
        }

        if (varianAktif && varianKombinasi.length === 0) {
            toast.error('Varian aktif tapi belum ada kombinasi — klik "Generate Kombinasi" dulu');
            return;
        }

        let varianPayload: { grup: typeof grupValid; kombinasi: VarianKombinasiState[] } | null = null;
        if (varianAktif) {
            const parsedVarian = simpanVarianSchema.safeParse({
                grup: grupValid,
                kombinasi: varianKombinasi,
            });
            if (!parsedVarian.success) {
                toast.error(parsedVarian.error.issues[0]?.message ?? "Data varian tidak valid");
                return;
            }
            varianPayload = parsedVarian.data;
        }

        const hargaEfektif = varianAktif
            ? Math.min(...varianKombinasi.map((k) => k.harga))
            : formData.harga;
        const stokEfektif = varianAktif
            ? varianKombinasi.reduce((sum, k) => sum + k.stok, 0)
            : formData.stok;
        const statusEfektif =
            varianAktif && stokEfektif <= 0 ? "Habis" : formData.status;

        startTransition(async () => {
            tampilkanLoading(formMode === "create" ? "Menambahkan produk..." : "Menyimpan perubahan...");
            try {
                let uploadedUrls: string[] = [];
                if (newFiles.length > 0) {
                    uploadedUrls = await uploadProdukImages(newFiles);
                }
                const fotos = [...existingFotos, ...uploadedUrls];

                const parsed = produkSchema.safeParse({
                    ...formData,
                    harga: hargaEfektif,
                    stok: stokEfektif,
                    status: statusEfektif,
                    fotos,
                });
                if (!parsed.success) {
                    Swal.close();
                    toast.error(parsed.error.issues[0]?.message ?? "Data tidak valid");
                    return;
                }

                let produkId: string;

                if (formMode === "create") {
                    const res = await createProduk(parsed.data);
                    produkId = res.data.produk_id;

                    const newItem: ProdukItem = {
                        produk_id: res.data.produk_id,
                        jurusan_id: res.data.jurusan_id,
                        nama_produk: res.data.nama_produk,
                        deskripsi: res.data.deskripsi,
                        fotos,
                        harga: res.data.harga,
                        status: res.data.status,
                        view_count: res.data.view_count,
                        sold_count: res.data.sold_count,
                        stok: parsed.data.stok,
                        kondisi: parsed.data.kondisi,
                        status_publikasi: res.data.status_publikasi ?? "Pending",
                    };
                    setProducts((prev) => [newItem, ...prev]);
                } else if (formMode === "edit" && editingId) {
                    produkId = editingId;
                    const original = products.find((p) => p.produk_id === editingId);

                    const kontenBerubah = original
                        ? isKontenBerubah(original, parsed.data, fotos)
                        : true;
                    const harusReviewUlang =
                        kontenBerubah &&
                        (original?.status_publikasi === "Published" ||
                            original?.status_publikasi === "Revisi");

                    const nextStatusPublikasi = harusReviewUlang
                        ? "Pending"
                        : original?.status_publikasi ?? "Pending";

                    await updateProduk(editingId, {
                        ...parsed.data,
                        status_publikasi: nextStatusPublikasi,
                    });

                    setProducts((prev) =>
                        prev.map((p) =>
                            p.produk_id === editingId
                                ? { ...p, ...parsed.data, fotos, status_publikasi: nextStatusPublikasi }
                                : p
                        )
                    );
                } else {
                    Swal.close();
                    return;
                }

                await simpanVarianProduk(produkId, {
                    grup: varianAktif && varianPayload ? varianPayload.grup : [],
                    kombinasi: varianAktif && varianPayload ? varianPayload.kombinasi : [],
                });

                Swal.close();
                toast.success(
                    formMode === "create"
                        ? "Produk berhasil ditambahkan"
                        : "Produk berhasil diperbarui"
                );
                closeForm();
            } catch (err) {
                Swal.close();
                if (err instanceof Error && err.message === "FileTooLarge") {
                    toast.error("Ukuran salah satu file melebihi 2MB");
                    return;
                }
                if (err instanceof Error && err.message === "FileTipeSalah") {
                    toast.error("Tipe file tidak didukung");
                    return;
                }
                toast.error(formMode === "create" ? "Gagal menambahkan produk" : "Gagal memperbarui produk");
            }
        });
    };

    const handleDelete = (item: ProdukItem) => {
        confirmHapus(item.nama_produk).then((confirmed) => {
            if (!confirmed) return;
            startTransition(async () => {
                tampilkanLoading("Menghapus produk...");
                try {
                    await deleteProduk(item.produk_id);
                    setProducts((prev) => prev.filter((p) => p.produk_id !== item.produk_id));
                    Swal.close();
                    toast.success("Produk berhasil dihapus");
                } catch {
                    Swal.close();
                    toast.error("Gagal menghapus produk");
                }
            });
        });
    };

    const triggerUploadGambar = (idx: number) => {
        setGambarTargetIdx(idx);
        gambarInputRef.current?.click();
    };

    const handleGambarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || gambarTargetIdx === null) return;
        handleUploadGambarKombinasi(gambarTargetIdx, file);
    };

    const handleUploadGambarKombinasi = async (idx: number, file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("File harus berupa gambar");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error("Ukuran gambar melebihi 2MB");
            return;
        }
        setUploadingGambarIdx(idx);
        try {
            const url = await uploadVarianImage(file);
            setVarianKombinasi((prev) => prev.map((k, i) => (i === idx ? { ...k, gambar: url } : k)));
        } catch (err) {
            if (err instanceof Error && err.message === "FileTooLarge") {
                toast.error("Ukuran gambar melebihi 2MB");
            } else if (err instanceof Error && err.message === "FileTipeSalah") {
                toast.error("Tipe file tidak didukung");
            } else {
                toast.error("Gagal mengunggah gambar");
            }
        } finally {
            setUploadingGambarIdx(null);
        }
    };

    const removeGambarKombinasi = (idx: number) => {
        setVarianKombinasi((prev) => prev.map((k, i) => (i === idx ? { ...k, gambar: undefined } : k)));
    };

    return (
        <div className="space-y-6 px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                    Manajemen Produk
                </h1>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Umum</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Manajemen Produk</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="relative flex-1 min-w-22 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 bg-gray-50 border-gray-200 rounded-xl text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs text-gray-500">Status</Label>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
                            >
                                <SelectTrigger className="w-40 h-9 text-sm bg-gray-50 border-gray-200 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={openCreateForm} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl self-end gap-1.5">
                            <Plus className="h-4 w-4" />
                            Tambah Produk
                        </Button>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Nama Produk</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Gambar</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Harga</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Stok</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status Publikasi</TableHead>
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
                                <TableRow key={item.produk_id} className="h-16 hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">{item.nama_produk}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center overflow-hidden">
                                            {item.fotos[0] ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.fotos[0]} alt={item.nama_produk} className="h-full w-full object-cover" />
                                            ) : (
                                                <Package className="h-5 w-5 text-amber-600" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6 whitespace-nowrap">
                                        {formatRupiah(item.harga)}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm py-4 px-6">{item.stok}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        {(() => {
                                            const statusTampil = getStatusTampil(item);
                                            return (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusTampil === "Tersedia" ? "bg-green-100 text-green-600" :
                                                    statusTampil === "Habis" ? "bg-amber-100 text-amber-600" :
                                                        "bg-red-100 text-red-600"
                                                    }`}>
                                                    {statusTampil}
                                                </span>
                                            );
                                        })()}
                                    </TableCell>

                                    <TableCell className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status_publikasi === "Published" ? "bg-emerald-100 text-emerald-600" :
                                            item.status_publikasi === "Revisi" ? "bg-red-100 text-red-600" :
                                                "bg-amber-100 text-amber-600"
                                            }`}>
                                            {item.status_publikasi}
                                        </span>
                                    </TableCell>

                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => openDetail(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-500 transition-colors" title="Lihat Detail">
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => openEditForm(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-500 transition-colors" title="Edit Produk">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(item)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Hapus Produk">
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

            {/* Detail */}
            <Dialog
                open={!!detailItem}
                onOpenChange={(open) => {
                    if (!open) {
                        setDetailItem(null);
                        setDetailVarian(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 shrink-0 border-b border-gray-100 bg-sky-50/60">
                        <DialogTitle className="text-base">Detail Produk</DialogTitle>
                    </DialogHeader>

                    {detailItem && (
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Kolom Gambar */}
                                <div className="space-y-3">
                                    <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                        {detailItem.fotos.length > 0 ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={detailItem.fotos[activeImageIndex]}
                                                alt={detailItem.nama_produk}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Package className="h-10 w-10 text-gray-300" />
                                        )}
                                    </div>

                                    {detailItem.fotos.length > 1 && (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={goPrevImage}
                                                className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 shrink-0"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>

                                            <div className="flex items-center justify-center gap-1.5 overflow-x-auto">
                                                {detailItem.fotos.map((img, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setActiveImageIndex(idx)}
                                                        className={`h-9 w-9 rounded-md overflow-hidden border shrink-0 transition-all ${idx === activeImageIndex
                                                            ? "border-sky-500 ring-2 ring-sky-200"
                                                            : "border-gray-200"
                                                            }`}
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={img}
                                                            alt={`${detailItem.nama_produk} ${idx + 1}`}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={goNextImage}
                                                className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 shrink-0"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Kolom Informasi */}
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-gray-800">{detailItem.nama_produk}</h2>

                                    <div>
                                        <p className="text-xs text-gray-400">Harga</p>
                                        <p className="text-lg font-bold text-sky-600">
                                            {formatRupiah(detailItem.harga)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className={`text-sm text-gray-500 leading-relaxed ${!showFullDesc ? "line-clamp-3" : ""}`}>
                                            {detailItem.deskripsi || "-"}
                                        </p>
                                        {detailItem.deskripsi && detailItem.deskripsi.length > 120 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowFullDesc((v) => !v)}
                                                className="mt-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                                            >
                                                {showFullDesc ? "Sembunyikan" : "Lihat selengkapnya"}
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-400 pt-1">
                                        Stok : {detailItem.stok} &nbsp;·&nbsp; Terjual : {detailItem.sold_count} &nbsp;·&nbsp; Kondisi : {detailItem.kondisi ?? "-"}
                                    </p>

                                    {/* Status Publikasi */}
                                    <div className="pt-1">
                                        <p className="text-xs text-gray-400 mb-1">Status Publikasi</p>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${detailItem.status_publikasi === "Published" ? "bg-emerald-100 text-emerald-600" :
                                            detailItem.status_publikasi === "Revisi" ? "bg-red-100 text-red-600" :
                                                "bg-amber-100 text-amber-600"
                                            }`}>
                                            {detailItem.status_publikasi}
                                        </span>
                                    </div>

                                    {/* Catatan Revisi (kalau ada) */}
                                    {detailItem.status_publikasi === "Revisi" && detailItem.catatan_revisi && (
                                        <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-100">
                                            <p className="text-xs font-medium text-red-600">Catatan Revisi:</p>
                                            <p className="text-xs text-red-500 mt-1">{detailItem.catatan_revisi}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Varian Produk */}
                            {loadingDetailVarian && (
                                <p className="text-xs text-gray-400 mt-4">Memuat varian...</p>
                            )}

                            {detailVarian && detailVarian.grup.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">Varian Produk</p>
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 text-gray-500">
                                                <tr>
                                                    {detailVarian.grup.map((g) => (
                                                        <th key={g.grup_id} className="px-3 py-2 text-left font-medium">
                                                            {g.nama}
                                                        </th>
                                                    ))}
                                                    <th className="px-3 py-2 text-left font-medium">Gambar</th>
                                                    <th className="px-3 py-2 text-left font-medium">Harga</th>
                                                    <th className="px-3 py-2 text-left font-medium">Stok</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {detailVarian.kombinasi.map((k) => (
                                                    <tr key={k.kombinasi_id}>
                                                        {detailVarian.grup.map((g) => {
                                                            const match = k.opsi.find((ko) => ko.opsi.grup_id === g.grup_id);
                                                            return (
                                                                <td key={g.grup_id} className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                                                    {match?.opsi.nama ?? "-"}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-3 py-2">
                                                            {k.gambar ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={k.gambar}
                                                                    alt=""
                                                                    className="h-8 w-8 rounded-md object-cover border border-gray-200"
                                                                />
                                                            ) : (
                                                                <span className="text-gray-300">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                                            {formatRupiah(k.harga)}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-600">{k.stok}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Tambah / Edit */}
            <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-gray-100">
                        <DialogTitle>{formMode === "create" ? "Tambah Produk" : "Edit Produk"}</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Nama Produk</Label>
                            <Input
                                value={formData.nama_produk}
                                onChange={(e) => handleFormChange("nama_produk", e.target.value)}
                                placeholder="Contoh: Bento Cake"
                                className="bg-gray-50 border-gray-200 rounded-lg"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Deskripsi</Label>
                            <Textarea
                                value={formData.deskripsi}
                                onChange={(e) => handleFormChange("deskripsi", e.target.value)}
                                placeholder="Tulis deskripsi produk..."
                                className="min-h-30 bg-gray-50 border-gray-200 rounded-lg resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Foto Produk (maks 5, @2MB)</Label>
                            <div className="flex flex-wrap gap-2">
                                {existingFotos.map((url, idx) => (
                                    <div key={`old-${idx}`} className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200 group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="" className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingFoto(idx)}
                                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}

                                {newPreviews.map((url, idx) => (
                                    <div key={`new-${idx}`} className="relative h-20 w-20 rounded-lg overflow-hidden border border-sky-200 group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="" className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeNewFoto(idx)}
                                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}

                                {existingFotos.length + newFiles.length < MAX_FILES && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-sky-400 hover:text-sky-500 transition-colors"
                                    >
                                        <ImagePlus className="h-5 w-5" />
                                        <span className="text-[10px] mt-1">Tambah</span>
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            {/* Input tersembunyi untuk upload gambar per kombinasi varian */}
                            <input
                                ref={gambarInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleGambarFileChange}
                            />
                        </div>

                        {/* ── Toggle Varian ── */}
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Varian Produk</p>
                                <p className="text-xs text-gray-400">Aktifkan kalau produk punya pilihan seperti Rasa, Desain, atau Warna</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setVarianAktif((v) => !v)}
                                disabled={loadingVarian}
                                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${varianAktif ? "bg-sky-500" : "bg-gray-300"}`}
                            >
                                <span
                                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${varianAktif ? "translate-x-5" : "translate-x-0"}`}
                                />
                            </button>
                        </div>

                        {!varianAktif ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-sm text-gray-600">Harga</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                                            Rp
                                        </span>
                                        <Input
                                            value={formData.harga === 0 ? "" : formatNominalInput(String(formData.harga))}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, "");
                                                handleFormChange("harga", digits === "" ? 0 : Number(digits));
                                            }}
                                            inputMode="numeric"
                                            placeholder="0"
                                            className="bg-gray-50 border-gray-200 rounded-lg pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm text-gray-600">Stok</Label>
                                    <Input
                                        type="number"
                                        value={formData.stok === 0 ? "" : formData.stok}
                                        onChange={(e) => handleFormChange("stok", e.target.value === "" ? 0 : Number(e.target.value))}
                                        placeholder="0"
                                        className="bg-gray-50 border-gray-200 rounded-lg"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 rounded-lg border border-sky-200 bg-sky-50/40 p-4">
                                {/* Grup varian */}
                                <div className="space-y-3">
                                    {varianGrup.map((grup, grupIdx) => (
                                        <div key={grupIdx} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={grup.nama}
                                                    onChange={(e) => updateVarianGrupNama(grupIdx, e.target.value)}
                                                    placeholder="Nama grup, contoh: Rasa"
                                                    className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                                                />
                                                {varianGrup.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVarianGrup(grupIdx)}
                                                        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2 pl-1">
                                                {grup.opsi.map((opsi, opsiIdx) => (
                                                    <div key={opsiIdx} className="flex items-center gap-1">
                                                        <Input
                                                            value={opsi.nama}
                                                            onChange={(e) => updateVarianOpsiNama(grupIdx, opsiIdx, e.target.value)}
                                                            placeholder="mis. Oreo"
                                                            className="h-8 w-32 bg-gray-50 border-gray-200 rounded-lg text-xs"
                                                        />
                                                        {grup.opsi.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeVarianOpsi(grupIdx, opsiIdx)}
                                                                className="h-6 w-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => addVarianOpsi(grupIdx)}
                                                    className="h-8 px-2 flex items-center gap-1 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-sky-400 hover:text-sky-500"
                                                >
                                                    <Plus className="h-3 w-3" /> Opsi
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addVarianGrup}
                                        className="flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Tambah Grup Varian
                                    </button>
                                </div>

                                <Button
                                    type="button"
                                    onClick={generateKombinasi}
                                    variant="outline"
                                    className="w-full rounded-lg border-sky-300 text-sky-600 hover:bg-sky-50"
                                >
                                    Generate Kombinasi
                                </Button>

                                {/* Tabel kombinasi */}
                                {varianKombinasi.length > 0 && (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 text-gray-500">
                                                <tr>
                                                    {grupValid.map((g) => (
                                                        <th key={g.nama} className="px-3 py-2 text-left font-medium">{g.nama}</th>
                                                    ))}
                                                    <th className="px-3 py-2 text-left font-medium">Gambar</th>
                                                    <th className="px-3 py-2 text-left font-medium">Harga</th>
                                                    <th className="px-3 py-2 text-left font-medium">Stok</th>
                                                    <th className="px-3 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {varianKombinasi.map((k, idx) => (
                                                    <tr key={idx}>
                                                        {k.opsi_nama.map((nama, i) => (
                                                            <td key={i} className="px-3 py-2 text-gray-600 whitespace-nowrap">{nama}</td>
                                                        ))}
                                                        <td className="px-3 py-2">
                                                            {k.gambar ? (
                                                                <div className="relative h-10 w-10 rounded-md overflow-hidden border border-gray-200 group">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={k.gambar} alt="" className="h-full w-full object-cover" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeGambarKombinasi(idx)}
                                                                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => triggerUploadGambar(idx)}
                                                                    disabled={uploadingGambarIdx === idx}
                                                                    className="h-10 w-10 flex items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-gray-400 hover:border-sky-400 hover:text-sky-500 disabled:opacity-50"
                                                                >
                                                                    {uploadingGambarIdx === idx ? (
                                                                        <span className="text-[9px]">...</span>
                                                                    ) : (
                                                                        <ImagePlus className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                value={k.harga === 0 ? "" : formatNominalInput(String(k.harga))}
                                                                onChange={(e) => {
                                                                    const digits = e.target.value.replace(/\D/g, "");
                                                                    updateKombinasiHarga(idx, digits === "" ? 0 : Number(digits));
                                                                }}
                                                                inputMode="numeric"
                                                                placeholder="0"
                                                                className="h-8 w-24 bg-gray-50 border-gray-200 rounded-md text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={k.stok === 0 ? "" : k.stok}
                                                                onChange={(e) => updateKombinasiStok(idx, e.target.value === "" ? 0 : Number(e.target.value))}
                                                                placeholder="0"
                                                                className="h-8 w-16 bg-gray-50 border-gray-200 rounded-md text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeKombinasi(idx)}
                                                                className="h-6 w-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <p className="text-[11px] text-gray-400">
                                    Harga & Stok di atas (untuk tampilan tabel produk) akan otomatis dihitung dari harga terendah dan total stok semua kombinasi.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm text-gray-600">Kondisi</Label>
                                <Input
                                    value={formData.kondisi}
                                    onChange={(e) => handleFormChange("kondisi", e.target.value)}
                                    placeholder="Baru / Bekas"
                                    className="bg-gray-50 border-gray-200 rounded-lg"
                                />
                            </div>
                            {!varianAktif && (
                                <div className="space-y-1.5">
                                    <Label className="text-sm text-gray-600">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v) => handleFormChange("status", v as ProdukForm["status"])}
                                        disabled={formData.stok === 0}
                                    >
                                        <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Tersedia">Tersedia</SelectItem>
                                            <SelectItem value="Habis">Habis</SelectItem>
                                            <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {formData.stok === 0 && (
                                        <p className="text-[11px] text-amber-600">Status otomatis habis karena stok 0</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 shrink-0 border-t border-gray-100">
                        <Button onClick={closeForm} variant="outline" className="rounded-lg">Batal</Button>
                        <Button onClick={handleSubmitForm} disabled={isPending} className="bg-sky-500 hover:bg-sky-600 text-white rounded-lg">
                            {isPending ? "Menyimpan..." : formMode === "create" ? "Simpan Produk" : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}