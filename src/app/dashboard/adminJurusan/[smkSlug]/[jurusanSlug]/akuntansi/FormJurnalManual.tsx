"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AKUN, AKUN_MAP, KODE, PESAN_GUNAKAN_PENGELUARAN, TEMPLATE_JURNAL, TEMPLATE_MAP, adalahPengeluaranKas, type TipeJurnalManual } from "@/lib/akuntansi/coa";
import { saldoAkunPer, validasiBarisManual, type BarisJurnal, type Jurnal } from "@/lib/akuntansi/engine";
import { formatNominalInput } from "@/lib/utils/format";
import { Lencana, rp } from "./ui";

interface Props {
    jurnal: Jurnal[];
    tipeDiizinkan: TipeJurnalManual[];
    hariIni: string;
}

const NAMA_TIPE: Record<TipeJurnalManual, string> = {
    ModalAwal: "Modal Awal",
    Penyesuaian: "Jurnal Penyesuaian",
    Umum: "Jurnal Umum",
};

const BEBAS = "bebas";
const selectCls = "h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm";

interface BarisBebas {
    kode: string;
    debit: string;
    kredit: string;
}

const angka = (s: string) => Number(s.replace(/\D/g, "") || 0);

export default function FormJurnalManual({ jurnal, tipeDiizinkan, hariIni }: Props) {
    const router = useRouter();
    const [tipe, setTipe] = useState<TipeJurnalManual>(tipeDiizinkan[0]);
    const [templateId, setTemplateId] = useState<string>("");
    const [tanggal, setTanggal] = useState(hariIni);
    const [nominal, setNominal] = useState("");
    const [keterangan, setKeterangan] = useState("");
    const [bebas, setBebas] = useState<BarisBebas[]>([
        { kode: KODE.KAS, debit: "", kredit: "" },
        { kode: KODE.MODAL, debit: "", kredit: "" },
    ]);
    const [menyimpan, setMenyimpan] = useState(false);

    const daftarTemplate = TEMPLATE_JURNAL.filter((t) => t.tipe === tipe);
    const template = templateId && templateId !== BEBAS ? TEMPLATE_MAP[templateId] : undefined;
    const modeBebas = templateId === BEBAS;
    const n = angka(nominal);

    const saldoPersediaan = useMemo(() => saldoAkunPer(jurnal, KODE.PERSEDIAAN, tanggal), [jurnal, tanggal]);

    const baris: BarisJurnal[] = useMemo(() => {
        if (modeBebas) return bebas.map((b) => ({ kode: b.kode, debit: angka(b.debit), kredit: angka(b.kredit) }));
        if (!template || n <= 0) return [];
        if (template.persediaanAkhir) {
            const selisih = n - saldoPersediaan;
            if (selisih > 0) return [{ kode: KODE.PERSEDIAAN, debit: selisih, kredit: 0 }, { kode: KODE.PEMBELIAN, debit: 0, kredit: selisih }];
            if (selisih < 0) return [{ kode: KODE.PEMBELIAN, debit: -selisih, kredit: 0 }, { kode: KODE.PERSEDIAAN, debit: 0, kredit: -selisih }];
            return [];
        }
        return [{ kode: template.debit, debit: n, kredit: 0 }, { kode: template.kredit, debit: 0, kredit: n }];
    }, [modeBebas, bebas, template, n, saldoPersediaan]);

    const totalDebit = baris.reduce((s, b) => s + b.debit, 0);
    const totalKredit = baris.reduce((s, b) => s + b.kredit, 0);
    const cek = validasiBarisManual(baris);
    const harusPengeluaran = tipe === "Umum" && adalahPengeluaranKas(baris);

    function gantiTipe(t: TipeJurnalManual) {
        setTipe(t);
        setTemplateId("");
        setNominal("");
    }

    async function simpan() {
        if (!cek.ok) return toast.error(cek.error);
        if (harusPengeluaran) return toast.error(PESAN_GUNAKAN_PENGELUARAN);
        if (!keterangan.trim()) return toast.error("Keterangan wajib diisi");
        setMenyimpan(true);
        try {
            const res = await fetch("/api/akuntansi/jurnal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipe,
                    templateId: template?.id ?? null,
                    tanggal,
                    keterangan: keterangan.trim(),
                    baris: cek.baris,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "Gagal memposting jurnal");
            toast.success("Jurnal berhasil diposting");
            setNominal("");
            setKeterangan("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal memposting jurnal");
        } finally {
            setMenyimpan(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                {tipeDiizinkan.length > 1 && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Jenis Jurnal</label>
                        <select className={selectCls} value={tipe} onChange={(e) => gantiTipe(e.target.value as TipeJurnalManual)}>
                            {tipeDiizinkan.map((t) => (
                                <option key={t} value={t}>{NAMA_TIPE[t]}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{tipe === "Penyesuaian" ? "Jenis Penyesuaian" : "Jenis Transaksi"}</label>
                    <select className={selectCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                        <option value="">Pilih…</option>
                        {daftarTemplate.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                        <option value={BEBAS}>Jurnal bebas (atur akun sendiri)</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Tanggal</label>
                    <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-gray-50" />
                </div>
                {!modeBebas && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">{template?.persediaanAkhir ? "Nilai Persediaan Akhir (Rp)" : "Nominal (Rp)"}</label>
                        <Input inputMode="numeric" placeholder="0" value={nominal} onChange={(e) => setNominal(formatNominalInput(e.target.value))} className="bg-gray-50 font-mono" />
                    </div>
                )}
            </div>

            {template && <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">{template.hint}</p>}
            {template?.persediaanAkhir && n > 0 && (
                <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    Saldo persediaan per {tanggal}: <span className="font-mono">{rp(saldoPersediaan)}</span> → selisih yang dijurnal: <span className="font-mono">{rp(n - saldoPersediaan)}</span>
                </p>
            )}

            {harusPengeluaran && (
                <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{PESAN_GUNAKAN_PENGELUARAN}</p>
            )}

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Keterangan</label>
                <Input placeholder="Mis. Gaji karyawan September belum dibayar" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} className="bg-gray-50" />
            </div>

            {modeBebas ? (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Baris Jurnal</p>
                    {bebas.map((b, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2">
                            <select className={`${selectCls} col-span-6`} value={b.kode} onChange={(e) => setBebas(bebas.map((x, j) => (j === i ? { ...x, kode: e.target.value } : x)))}>
                                {AKUN.map((a) => (
                                    <option key={a.kode} value={a.kode}>{a.kode} — {a.nama}</option>
                                ))}
                            </select>
                            <Input inputMode="numeric" placeholder="Debit" value={b.debit} onChange={(e) => setBebas(bebas.map((x, j) => (j === i ? { ...x, debit: formatNominalInput(e.target.value), kredit: "" } : x)))} className="col-span-3 bg-gray-50 font-mono" />
                            <Input inputMode="numeric" placeholder="Kredit" value={b.kredit} onChange={(e) => setBebas(bebas.map((x, j) => (j === i ? { ...x, kredit: formatNominalInput(e.target.value), debit: "" } : x)))} className="col-span-3 bg-gray-50 font-mono" />
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setBebas([...bebas, { kode: KODE.KAS, debit: "", kredit: "" }])}>+ Tambah Baris</Button>
                </div>
            ) : (
                baris.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-3 py-2 text-left">Akun</th>
                                    <th className="px-3 py-2 text-right">Debit</th>
                                    <th className="px-3 py-2 text-right">Kredit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {baris.map((b, i) => (
                                    <tr key={i} className="border-t border-gray-50">
                                        <td className={`px-3 py-2 ${b.kredit > 0 ? "pl-8" : ""}`}>{b.kode} — {AKUN_MAP[b.kode]?.nama}</td>
                                        <td className="px-3 py-2 text-right font-mono">{b.debit ? rp(b.debit) : ""}</td>
                                        <td className="px-3 py-2 text-right font-mono">{b.kredit ? rp(b.kredit) : ""}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>Total Debit <span className="font-mono">{rp(totalDebit)}</span></span>
                    <span>Total Kredit <span className="font-mono">{rp(totalKredit)}</span></span>
                    {baris.length > 0 && <Lencana ok={cek.ok} teksOk="Balance" teksTidak="Belum Balance" />}
                </div>
                <Button type="button" onClick={simpan} disabled={menyimpan || !cek.ok || !keterangan.trim() || harusPengeluaran} className="rounded-full bg-sky-600 px-6 hover:bg-sky-700">
                    {menyimpan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Posting Jurnal
                </Button>
            </div>
        </div>
    );
}
