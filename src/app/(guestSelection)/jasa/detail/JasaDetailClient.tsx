"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tampilkanLoading } from "@/lib/utils/alert";
import Swal from "sweetalert2";
import {
    Star,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    ClipboardList,
    FileText,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { JasaPublicItem } from "@/lib/data/jasa-public";
import { buatPesananJasa, batalkanPesananJasa } from "@/lib/api/pesanan-api";
import { useMidtransSnap } from "@/lib/hooks/useMidtransSnap";
import JasaCard from "@/components/jasa.card";
import type { FavoritIds } from "@/lib/data/favorit-public";
import RingkasanRatingJasa from "./RingkasanRatingJasa";
import DaftarUlasanJasa from "./DaftarUlasanJasa";

const rupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

type TabDetail = "deskripsi" | "portofolio" | "review";

const DAFTAR_TAB: { key: TabDetail; label: string }[] = [
    { key: "deskripsi", label: "Deskripsi" },
    { key: "portofolio", label: "Portofolio" },
    { key: "review", label: "Review" },
];

function formatNomorWa(nomor?: string) {
    if (!nomor) return null;
    const bersih = nomor.replace(/[^0-9]/g, "");
    if (!bersih) return null;
    if (bersih.startsWith("0")) return `62${bersih.slice(1)}`;
    if (bersih.startsWith("62")) return bersih;
    return bersih;
}

function buatLinkWhatsapp(nomor: string | undefined, pesan: string) {
    const target = formatNomorWa(nomor);
    if (!target) return null;
    return `https://wa.me/${target}?text=${encodeURIComponent(pesan)}`;
}

function namaFileDariUrl(url: string) {
    try {
        const bersih = url.split("?")[0];
        return decodeURIComponent(bersih.substring(bersih.lastIndexOf("/") + 1));
    } catch {
        return "portofolio.pdf";
    }
}

interface FormPemesananJasa {
    namaPelanggan: string;
    namaJasa: string;
    tanggal: string;
    nominalBayar: string;
}

const FORM_PEMESANAN_AWAL: FormPemesananJasa = {
    namaPelanggan: "",
    namaJasa: "",
    tanggal: "",
    nominalBayar: "",
};

export default function JasaDetailClient({
    jasa,
    rekomendasi,
    favoritIds,
    isLoggedIn,
}: {
    jasa: JasaPublicItem;
    rekomendasi: JasaPublicItem[];
    favoritIds: FavoritIds;
    isLoggedIn: boolean;
}) {
    const router = useRouter();
    const snapReady = useMidtransSnap();
    const [gambarAktif, setGambarAktif] = useState(0);
    const [tabAktif, setTabAktif] = useState<TabDetail>("deskripsi");

    const [formOpen, setFormOpen] = useState(false);
    const [formData, setFormData] = useState<FormPemesananJasa>(FORM_PEMESANAN_AWAL);
    const [isPending, setIsPending] = useState(false);

    // Popup WhatsApp muncul setelah Snap selesai (baik sukses maupun pending/ditutup)
    const [waPopupOpen, setWaPopupOpen] = useState(false);
    const [pesananBelumBayar, setPesananBelumBayar] = useState<{
        orderId: string;
        snapToken: string;
    } | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const galeri = jasa.fotos.length > 0 ? jasa.fotos : [jasa.gambar];

    const geserGaleri = (arah: 1 | -1) => {
        setGambarAktif((i) => (i + arah + galeri.length) % galeri.length);
    };

    const handleFormChange = (field: keyof FormPemesananJasa, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const openForm = () => {
        if (!isLoggedIn) {
            toast.info("Silakan login dulu untuk memesan jasa ini");
            router.push(`/auth/login?callbackUrl=/jasa/detail?id=${jasa.id}`);
            return;
        }
        setFormData({ ...FORM_PEMESANAN_AWAL, namaJasa: jasa.nama, nominalBayar: String(jasa.harga) });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setFormData(FORM_PEMESANAN_AWAL);
    };

    const nominalAngka = Number(formData.nominalBayar) || 0;
    const formValid =
        formData.namaPelanggan.trim() !== "" &&
        formData.tanggal !== "" &&
        nominalAngka > 0 &&
        nominalAngka <= jasa.harga;

    const bukaSnapPay = (snapToken: string, orderId: string) => {
        if (!window.snap) {
            toast.error("Metode pembayaran belum siap, coba lagi sesaat lagi");
            return;
        }

        window.snap.pay(snapToken, {
            onSuccess: () => {
                toast.success("Pesanan berhasil dibuat dan pembayaran diterima");
                setWaPopupOpen(true);
            },
            onPending: () => {
                toast.info(
                    "Pembayaran kamu masih menunggu diproses. Selesaikan pembayaran lewat halaman Pesanan Saya."
                );
            },
            onError: () => {
                toast.error("Pembayaran gagal, pesanan dibatalkan. Silakan coba lagi.");
                batalkanPesananJasa(orderId).catch(() => {
                    console.error("Gagal membatalkan pesanan yang belum dibayar");
                });
            },
            onClose: () => {
                // Jangan langsung batalkan — tanya dulu mau lanjut bayar atau batal
                setPesananBelumBayar({ orderId, snapToken });
            },
        });
    };

    const handleSubmitPesanan = async () => {
        if (!formValid) {
            toast.error("Lengkapi nama, tanggal, dan nominal pembayaran terlebih dahulu");
            return;
        }
        if (!snapReady || !window.snap) {
            toast.error("Metode pembayaran belum siap, coba lagi sesaat lagi");
            return;
        }

        setIsPending(true);
        tampilkanLoading("Membuat pesanan...");
        try {
            const result = await buatPesananJasa(jasa.id, {
                namaPelanggan: formData.namaPelanggan,
                tanggal: formData.tanggal,
                nominalBayar: nominalAngka,
            });

            Swal.close();
            closeForm();
            bukaSnapPay(result.snapToken, result.orderId);
        } catch (err) {
            Swal.close();
            toast.error(err instanceof Error ? err.message : "Gagal membuat pesanan, silakan coba lagi");
        } finally {
            setIsPending(false);
        }
    };

    const handleLanjutkanBayar = () => {
        if (!pesananBelumBayar || !snapReady || !window.snap) return;
        const { snapToken, orderId } = pesananBelumBayar;
        setPesananBelumBayar(null);
        bukaSnapPay(snapToken, orderId);
    };

    const handleBatalkanPesanan = async () => {
        if (!pesananBelumBayar) return;
        setIsCancelling(true);
        tampilkanLoading("Membatalkan pesanan...");
        try {
            await batalkanPesananJasa(pesananBelumBayar.orderId);
            Swal.close();
            toast.success("Pesanan dibatalkan");
            setPesananBelumBayar(null);
        } catch (err) {
            Swal.close();
            toast.error(err instanceof Error ? err.message : "Gagal membatalkan pesanan");
        } finally {
            setIsCancelling(false);
        }
    };

    const waLink = buatLinkWhatsapp(
        jasa.noWhatsapp,
        `Halo, saya sudah memesan jasa "${jasa.nama}" atas nama ${formData.namaPelanggan}. Mohon dikonfirmasi ya.`
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <nav className="mb-4 text-xs text-gray-400">
                    <Link href="/" className="hover:text-sky-500">Toko</Link>
                    <span className="mx-1.5">›</span>
                    <Link href="/jasa" className="hover:text-sky-500">Jasa</Link>
                    <span className="mx-1.5">›</span>
                    <span className="text-gray-500">Detail</span>
                </nav>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <div>
                        <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-gray-100">
                            <Image
                                src={galeri[gambarAktif]}
                                alt={jasa.nama}
                                fill
                                className="object-cover"
                            />
                        </div>

                        {galeri.length > 1 && (
                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    onClick={() => geserGaleri(-1)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <div className="flex flex-1 gap-2 overflow-x-auto">
                                    {galeri.map((src, i) => (
                                        <button
                                            key={src + i}
                                            onClick={() => setGambarAktif(i)}
                                            className={cn(
                                                "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2",
                                                gambarAktif === i ? "border-sky-500" : "border-transparent"
                                            )}
                                        >
                                            <Image src={src} alt={`${jasa.nama} ${i + 1}`} fill className="object-cover" />
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => geserGaleri(1)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-500">{jasa.jurusan}</p>
                        <p className="text-sm font-bold text-gray-700">{jasa.sekolah}</p>

                        <h1 className="text-2xl font-bold uppercase text-gray-900 sm:text-3xl">{jasa.nama}</h1>

                        <p className="text-xl font-bold text-gray-900">{rupiah(jasa.harga)}</p>


                        <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold text-gray-700">{jasa.rating.toFixed(1)}</span>
                            <span className="text-xs text-gray-400">
                                ({jasa.jumlahReview.toLocaleString("id-ID")} Rating)
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <Button
                                onClick={openForm}
                                variant="outline"
                                className="gap-2 rounded-full border-gray-300 px-6"
                            >
                                <ClipboardList className="h-4 w-4" />
                                Form Pemesanan
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-1 pt-3 text-xs text-gray-500">
                            <span>Estimasi Pengerjaan : {jasa.estimasiPengerjaan ?? "-"}</span>
                            <span>Project Selesai : {jasa.dipesan}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-10">
                    <div className="flex gap-2">
                        {DAFTAR_TAB.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setTabAktif(tab.key)}
                                className={cn(
                                    "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                                    tabAktif === tab.key
                                        ? "bg-sky-500 text-white"
                                        : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        {tabAktif === "deskripsi" && (
                            <p className="text-sm leading-relaxed text-gray-500">{jasa.deskripsi}</p>
                        )}
                        {tabAktif === "portofolio" && (
                            jasa.portofolio.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {jasa.portofolio.map((p) => (
                                        <a
                                            key={p.portofolio_id}
                                            href={p.file_path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:border-sky-300 hover:bg-sky-50/40 transition-colors group"
                                        >
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-gray-700">
                                                    {p.deskripsi || namaFileDariUrl(p.file_path)}
                                                </p>
                                                <p className="text-xs text-gray-400">Dokumen PDF</p>
                                            </div>
                                            <Download className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-sky-500 transition-colors" />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">Belum ada dokumen portofolio untuk jasa ini.</p>
                            )
                        )}
                        {tabAktif === "review" && (
                            <div className="space-y-6">
                                <RingkasanRatingJasa
                                    rating={jasa.rating}
                                    jumlahReview={jasa.jumlahReview}
                                    persentasePuas={jasa.persentasePuas ?? 0}
                                    breakdown={jasa.ratingBreakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }}
                                />
                                <DaftarUlasanJasa reviews={jasa.reviews ?? []} jumlahReview={jasa.jumlahReview} />
                            </div>
                        )}
                    </div>
                </div>

                {rekomendasi.length > 0 && (
                    <div className="mt-14">
                        <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">
                            Rekomendasi Untuk Anda
                        </h2>

                        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {rekomendasi.map((j) => (
                                <JasaCard
                                    key={j.id}
                                    jasa={j}
                                    initialFavorited={favoritIds.jasaIds.includes(j.jasaId)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="w-[92vw] max-w-md sm:max-w-md rounded-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-gray-100">
                        <DialogTitle className="text-lg font-bold text-gray-900">
                            Form Pemesanan Jasa
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Nama Pelanggan</Label>
                            <Input
                                value={formData.namaPelanggan}
                                onChange={(e) => handleFormChange("namaPelanggan", e.target.value)}
                                placeholder="Masukkan Nama Pelanggan"
                                className="bg-gray-50 border-gray-200 rounded-lg"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Nama Jasa</Label>
                            <Input
                                value={formData.namaJasa}
                                disabled
                                className="bg-gray-100 border-gray-200 rounded-lg text-gray-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Tanggal</Label>
                            <Input
                                type="date"
                                value={formData.tanggal}
                                onChange={(e) => handleFormChange("tanggal", e.target.value)}
                                className="bg-gray-50 border-gray-200 rounded-lg"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">Nominal Pembayaran</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                                    Rp
                                </span>
                                <Input
                                    type="number"
                                    value={formData.nominalBayar}
                                    onChange={(e) => handleFormChange("nominalBayar", e.target.value)}
                                    max={jasa.harga}
                                    className="pl-9 bg-gray-50 border-gray-200 rounded-lg"
                                />
                            </div>
                            {nominalAngka > jasa.harga && (
                                <p className="text-xs text-red-500">
                                    Nominal melebihi harga jasa ({rupiah(jasa.harga)})
                                </p>
                            )}
                            <p className="text-xs text-gray-400">
                                Total harga jasa {rupiah(jasa.harga)}. Bisa bayar DP dulu (kurang dari harga) atau
                                langsung lunas — sisanya bisa dilunasi kapan saja lewat halaman Pesanan Saya.
                            </p>
                        </div>

                        <p className="text-xs text-gray-400">
                            Setelah menekan Submit, jendela pembayaran akan terbuka — kamu bisa
                            memilih metode pembayaran (transfer bank, QRIS, e-wallet, dll) di sana.
                        </p>
                    </div>

                    <DialogFooter className="px-6 py-4 shrink-0 border-t border-gray-100">
                        <Button
                            onClick={handleSubmitPesanan}
                            disabled={isPending}
                            className="w-full rounded-full bg-sky-500 hover:bg-sky-600 text-white"
                        >
                            {isPending ? "Memproses..." : "Submit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!pesananBelumBayar}
                onOpenChange={(open) => {
                    if (!open && pesananBelumBayar) {
                        setPesananBelumBayar(null);
                        toast.info("Pesanan tersimpan, kamu bisa lanjutkan pembayaran dari halaman Pesanan Saya");
                    }
                }}
            >
                <DialogContent className="w-[92vw] max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900">
                            Pembayaran Belum Selesai
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500">
                        Pesanan kamu belum dibayar. Mau lanjutkan pembayaran sekarang, atau batalkan
                        pesanan ini (pesanan akan dihapus)?
                    </p>
                    <DialogFooter className="sm:justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBatalkanPesanan}
                            disabled={isCancelling}
                            className="rounded-full text-red-600 border-red-200 hover:bg-red-50"
                        >
                            {isCancelling ? "Membatalkan..." : "Batalkan Pesanan"}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleLanjutkanBayar}
                            disabled={isCancelling}
                            className="rounded-full bg-sky-500 hover:bg-sky-600 text-white"
                        >
                            Lanjutkan Pembayaran
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Popup WhatsApp setelah proses pembayaran Snap selesai/ditutup */}
            <Dialog open={waPopupOpen} onOpenChange={(open) => !open && setWaPopupOpen(false)}>
                <DialogContent className="w-[92vw] max-w-sm rounded-2xl p-6 text-center">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900">
                            Pesanan Berhasil Dibuat
                        </DialogTitle>
                    </DialogHeader>
                    <p className="mt-2 text-sm text-gray-500">
                        Hubungi penyedia jasa via WhatsApp untuk konfirmasi lebih lanjut.
                    </p>

                    <div className="mt-5 flex flex-col gap-2">
                        {waLink ? (
                            <a href={waLink} target="_blank" rel="noopener noreferrer">
                                <Button className="w-full gap-2 rounded-full bg-green-500 hover:bg-green-600 text-white">
                                    <MessageCircle className="h-4 w-4" />
                                    Chat via WhatsApp
                                </Button>
                            </a>
                        ) : (
                            <p className="text-xs text-red-500">Nomor WhatsApp penyedia jasa belum tersedia.</p>
                        )}
                        <Button
                            onClick={() => setWaPopupOpen(false)}
                            variant="outline"
                            className="w-full rounded-full border-gray-300"
                        >
                            Tutup
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}