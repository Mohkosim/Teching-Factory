"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AKUN_MAP, KATEGORI_KE_AKUN, KODE } from "@/lib/akuntansi/coa";
import { saldoAkunPer, type Jurnal } from "@/lib/akuntansi/engine";
import { formatNominalInput } from "@/lib/utils/format";
import { rp } from "./ui";

interface Props {
    jurnal: Jurnal[];
    hariIni: string;
}

const KATEGORI = Object.keys(KATEGORI_KE_AKUN);
const selectCls = "h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm";

export default function FormPengeluaran({ jurnal, hariIni }: Props) {
    const router = useRouter();
    const [tanggal, setTanggal] = useState(hariIni);
    const [kategori, setKategori] = useState(KATEGORI[0]);
    const [nama, setNama] = useState("");
    const [nominal, setNominal] = useState("");
    const [deskripsi, setDeskripsi] = useState("");
    const [bukti, setBukti] = useState<File | null>(null);
    const [menyimpan, setMenyimpan] = useState(false);

    const n = Number(nominal.replace(/\D/g, "") || 0);
    const akunDebit = KATEGORI_KE_AKUN[kategori];
    const saldoKas = useMemo(() => saldoAkunPer(jurnal, KODE.KAS, tanggal), [jurnal, tanggal]);
    const kasKurang = n > 0 && n > saldoKas;

    async function simpan() {
        if (!nama.trim()) return toast.error("Nama pengeluaran wajib diisi");
        if (n <= 0) return toast.error("Nominal harus lebih dari 0");
        setMenyimpan(true);
        try {
            const fd = new FormData();
            fd.append("nama", nama.trim());
            fd.append("kategori", kategori);
            fd.append("deskripsi", deskripsi.trim());
            fd.append("tanggal", tanggal);
            fd.append("nominal", String(n));
            if (bukti) fd.append("gambar", bukti);
            const res = await fetch("/api/laporan-keuangan/pengeluaran", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "Gagal menyimpan pengeluaran");
            toast.success("Pengeluaran berhasil dicatat");
            setNama("");
            setNominal("");
            setDeskripsi("");
            setBukti(null);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengeluaran");
        } finally {
            setMenyimpan(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Kategori</label>
                    <select className={selectCls} value={kategori} onChange={(e) => setKategori(e.target.value)}>
                        {KATEGORI.map((k) => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Tanggal</label>
                    <Input type="date" value={tanggal} max={hariIni} onChange={(e) => setTanggal(e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Nama Pengeluaran</label>
                    <Input placeholder="Mis. Listrik September / Beli kain 20 meter" value={nama} onChange={(e) => setNama(e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Nominal (Rp)</label>
                    <Input inputMode="numeric" placeholder="0" value={nominal} onChange={(e) => setNominal(formatNominalInput(e.target.value))} className="bg-gray-50 font-mono" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Keterangan (opsional)</label>
                    <Input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Bukti / Nota (opsional)</label>
                    <Input type="file" accept="image/*" onChange={(e) => setBukti(e.target.files?.[0] ?? null)} className="bg-gray-50" />
                </div>
            </div>

            {n > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-3 py-2 text-left">Jurnal yang akan dibuat otomatis</th>
                                <th className="px-3 py-2 text-right">Debit</th>
                                <th className="px-3 py-2 text-right">Kredit</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-gray-50">
                                <td className="px-3 py-2">{akunDebit} — {AKUN_MAP[akunDebit]?.nama}</td>
                                <td className="px-3 py-2 text-right font-mono">{rp(n)}</td>
                                <td />
                            </tr>
                            <tr className="border-t border-gray-50">
                                <td className="px-3 py-2 pl-8">{KODE.KAS} — {AKUN_MAP[KODE.KAS]?.nama}</td>
                                <td />
                                <td className="px-3 py-2 text-right font-mono">{rp(n)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {kategori === "Bahan Baku" && (
                <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
                    Pembelian bahan baku dicatat ke akun Pembelian. Sisa bahan baku yang belum terpakai di akhir periode disesuaikan lewat tab Jurnal Penyesuaian (Persediaan Akhir).
                </p>
            )}
            {kasKurang && (
                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    Saldo Kas &amp; Bank Jurusan per {tanggal} hanya <span className="font-mono">{rp(saldoKas)}</span>. Pengeluaran dibayar dari Kas, jadi pastikan modal awal sudah diinput atau saldo platform sudah ditarik.
                </p>
            )}

            <div className="flex justify-end">
                <Button type="button" onClick={simpan} disabled={menyimpan || n <= 0 || !nama.trim()} className="rounded-full bg-sky-600 px-6 hover:bg-sky-700">
                    {menyimpan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Pengeluaran
                </Button>
            </div>
        </div>
    );
}
