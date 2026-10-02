"use client";

import { useMemo } from "react";
import { AKUN } from "@/lib/akuntansi/coa";
import { arusKas, labaRugi, neraca, perubahanEkuitas, validasiSistem, type AktivitasArusKas, type Jurnal } from "@/lib/akuntansi/engine";
import { BarisLaporan, Kartu, Kepala, Lencana, Panel, Sel, rp, tanggalID } from "./ui";

interface Props {
    jurnal: Jurnal[];
    mulai: string;
    sampai: string;
}

const periodeTeks = (mulai: string, sampai: string) => `Periode ${tanggalID(mulai)} s.d. ${tanggalID(sampai)}`;

// ── Laba Rugi ───────────────────────────────────────────────────────────────
export function LabaRugiTab({ jurnal, mulai, sampai }: Props) {
    const lr = useMemo(() => labaRugi(jurnal, { mulai, sampai }), [jurnal, mulai, sampai]);
    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <Panel judul="Laporan Laba Rugi">
                    <p className="-mt-2 mb-3 text-xs text-gray-500">{periodeTeks(mulai, sampai)} — sudah termasuk jurnal penyesuaian</p>

                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pendapatan</p>
                    <BarisLaporan label="Penjualan Produk" nilai={lr.penjualanProduk} menjorok />
                    <BarisLaporan label="Pendapatan Jasa" nilai={lr.pendapatanJasa} menjorok />
                    <BarisLaporan label="Retur Penjualan (refund)" nilai={-lr.retur} menjorok />
                    <BarisLaporan label="Pendapatan Bersih" nilai={lr.pendapatanBersih} tebal garisAtas />

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Harga Pokok Penjualan (HPP)</p>
                    <BarisLaporan label="Persediaan Bahan Baku Awal" nilai={lr.persediaanAwal} menjorok />
                    <BarisLaporan label="Pembelian Bahan Baku" nilai={lr.pembelian} menjorok />
                    <BarisLaporan label="Persediaan Bahan Baku Akhir" nilai={-lr.persediaanAkhir} menjorok />
                    <BarisLaporan label="Harga Pokok Penjualan" nilai={lr.hpp} tebal garisAtas />
                    <BarisLaporan label="Laba Kotor" nilai={lr.labaKotor} tebal garisAtas warna={lr.labaKotor >= 0 ? "hijau" : "merah"} />

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Beban Operasional</p>
                    <BarisLaporan label="Beban Gaji" nilai={lr.bebanGaji} menjorok />
                    <BarisLaporan label="Beban Operasional" nilai={lr.bebanOperasional} menjorok />
                    <BarisLaporan label="Beban Lainnya" nilai={lr.bebanLainnya} menjorok />
                    <BarisLaporan label="Total Beban Operasional" nilai={lr.totalBebanOperasional} tebal garisAtas />

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Beban Platform</p>
                    <BarisLaporan label="Beban Admin Midtrans" nilai={lr.bebanMidtrans} menjorok />

                    <BarisLaporan label={lr.labaBersih >= 0 ? "Laba Bersih" : "Rugi Bersih"} nilai={lr.labaBersih} tebal garisAtas warna={lr.labaBersih >= 0 ? "hijau" : "merah"} />
                </Panel>
            </div>
            <div className="space-y-4">
                <Panel judul="Rasio">
                    <div className="space-y-3">
                        <Kartu label="Margin Laba Kotor" nilai={`${lr.marginKotorPersen}%`} />
                        <Kartu label="Margin Laba Bersih" nilai={`${lr.marginBersihPersen}%`} />
                    </div>
                </Panel>
                <Panel judul="Catatan">
                    <ul className="list-disc space-y-1.5 pl-4 text-xs text-gray-500">
                        <li>Pendapatan diakui saat pesanan berstatus Diterima/Selesai (bukan saat dibayar).</li>
                        <li>Ongkir dari pembeli adalah titipan kurir, bukan pendapatan.</li>
                        <li>HPP = Persediaan Awal + Pembelian − Persediaan Akhir. Isi persediaan akhir lewat tab Jurnal Penyesuaian.</li>
                        <li>Laba Rugi = Total Pendapatan − Total Beban.</li>
                    </ul>
                </Panel>
            </div>
        </div>
    );
}

// ── Perubahan Ekuitas ───────────────────────────────────────────────────────
export function PerubahanEkuitasTab({ jurnal, mulai, sampai }: Props) {
    const eq = useMemo(() => perubahanEkuitas(jurnal, { mulai, sampai }), [jurnal, mulai, sampai]);
    return (
        <div className="max-w-2xl">
            <Panel judul="Laporan Perubahan Ekuitas">
                <p className="-mt-2 mb-3 text-xs text-gray-500">{periodeTeks(mulai, sampai)}</p>
                <BarisLaporan label="Ekuitas Awal Periode" nilai={eq.ekuitasAwal} tebal />
                <BarisLaporan label="Tambahan Modal" nilai={eq.tambahanModal} menjorok />
                <BarisLaporan label={eq.labaBersih >= 0 ? "Laba Bersih Periode" : "Rugi Bersih Periode"} nilai={eq.labaBersih} menjorok />
                <BarisLaporan label="Prive / Penarikan Modal" nilai={-eq.prive} menjorok />
                <BarisLaporan label="Ekuitas Akhir Periode" nilai={eq.ekuitasAkhir} tebal garisAtas warna="hijau" />
                <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">Rumus: Ekuitas Akhir = Ekuitas Awal + Laba − Prive (disesuaikan jika ada tambahan modal).</p>
            </Panel>
        </div>
    );
}

// ── Neraca ──────────────────────────────────────────────────────────────────
export function NeracaTab({ jurnal, sampai }: Omit<Props, "mulai">) {
    const nr = useMemo(() => neraca(jurnal, { sampai }), [jurnal, sampai]);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kartu label="Total Aset" nilai={rp(nr.totalAset)} />
                <Kartu label="Total Kewajiban" nilai={rp(nr.totalKewajiban)} />
                <Kartu label="Total Ekuitas (+ laba berjalan)" nilai={rp(nr.totalEkuitas)} />
                <Kartu label="Selisih Neraca" nilai={rp(nr.selisih)} ok={nr.seimbang} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Panel judul="Aset">
                    <p className="-mt-2 mb-3 text-xs text-gray-500">Per {tanggalID(sampai)}</p>
                    {nr.aset.length === 0 && <p className="text-sm text-gray-400">Belum ada saldo aset.</p>}
                    {nr.aset.map((a) => (
                        <BarisLaporan key={a.kode} label={a.nama} nilai={a.saldo} />
                    ))}
                    <BarisLaporan label="TOTAL ASET" nilai={nr.totalAset} tebal garisAtas />
                </Panel>
                <Panel judul="Kewajiban & Ekuitas">
                    <p className="-mt-2 mb-3 text-xs text-gray-500">Per {tanggalID(sampai)}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Kewajiban</p>
                    {nr.kewajiban.length === 0 && <p className="py-1 pl-5 text-sm text-gray-400">Tidak ada kewajiban.</p>}
                    {nr.kewajiban.map((k) => (
                        <BarisLaporan key={k.kode} label={k.nama} nilai={k.saldo} menjorok />
                    ))}
                    <BarisLaporan label="Total Kewajiban" nilai={nr.totalKewajiban} tebal garisAtas />

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Ekuitas</p>
                    {nr.modal.map((m) => (
                        <BarisLaporan key={m.kode} label={m.nama} nilai={m.saldo} menjorok />
                    ))}
                    <BarisLaporan label={nr.labaBerjalan >= 0 ? "Laba Berjalan (sejak awal pembukuan)" : "Rugi Berjalan (sejak awal pembukuan)"} nilai={nr.labaBerjalan} menjorok />
                    <BarisLaporan label="Total Ekuitas" nilai={nr.totalEkuitas} tebal garisAtas />

                    <BarisLaporan label="TOTAL KEWAJIBAN & EKUITAS" nilai={nr.totalKewajibanEkuitas} tebal garisAtas />
                </Panel>
            </div>
            <p className="text-xs text-gray-500">Rumus: Aset = Liabilitas + Ekuitas.</p>
        </div>
    );
}

// ── Arus Kas ────────────────────────────────────────────────────────────────
function BagianArus({ judul, data, catatan }: { judul: string; data: AktivitasArusKas; catatan?: string }) {
    return (
        <Panel judul={judul} kanan={<span className={`font-mono text-sm font-semibold ${data.bersih < 0 ? "text-red-600" : "text-gray-800"}`}>{rp(data.bersih)}</span>}>
            {data.items.length === 0 ? (
                <p className="text-sm text-gray-400">{catatan ?? "Tidak ada transaksi pada periode ini."}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <Kepala>Jenis Transaksi</Kepala>
                                <Kepala kanan>Kas Masuk</Kepala>
                                <Kepala kanan>Kas Keluar</Kepala>
                                <Kepala kanan>Bersih</Kepala>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((i) => (
                                <tr key={i.label} className="border-b border-gray-50">
                                    <Sel>{i.label}</Sel>
                                    <Sel kanan mono>{i.masuk ? rp(i.masuk) : "-"}</Sel>
                                    <Sel kanan mono>{i.keluar ? rp(i.keluar) : "-"}</Sel>
                                    <Sel kanan mono kelas={i.bersih < 0 ? "text-red-600" : ""}>{rp(i.bersih)}</Sel>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    );
}

export function ArusKasTab({ jurnal, mulai, sampai }: Props) {
    const ak = useMemo(() => arusKas(jurnal, { mulai, sampai }), [jurnal, mulai, sampai]);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Kartu label="Saldo Kas Awal" nilai={rp(ak.saldoAwal)} />
                <Kartu label="Arus Kas Bersih" nilai={rp(ak.arusBersih)} />
                <Kartu label="Saldo Kas Akhir" nilai={rp(ak.saldoAkhir)} />
            </div>
            <p className="text-xs text-gray-500">
                {periodeTeks(mulai, sampai)}. Metode langsung dari akun Kas & Bank Jurusan (1110) + Saldo di Platform (1120). Perpindahan antar kedua akun
                (penarikan saldo) tidak dihitung sebagai arus kas.
            </p>
            <BagianArus judul="Aktivitas Operasi" data={ak.operasi} />
            <BagianArus judul="Aktivitas Investasi" data={ak.investasi} catatan="Tidak ada pembelian/penjualan aset tetap — jurusan belum mencatat akun aset tetap." />
            <BagianArus judul="Aktivitas Pendanaan" data={ak.pendanaan} catatan="Belum ada modal awal / tambahan modal / prive pada periode ini." />
            <Panel>
                <BarisLaporan label="Saldo Kas Awal" nilai={ak.saldoAwal} />
                <BarisLaporan label="Arus Kas Bersih (Operasi + Investasi + Pendanaan)" nilai={ak.arusBersih} />
                <BarisLaporan label="Saldo Kas Akhir" nilai={ak.saldoAkhir} tebal garisAtas />
            </Panel>
        </div>
    );
}

// ── Validasi sistem ─────────────────────────────────────────────────────────
export function ValidasiTab({ jurnal, sampai }: Omit<Props, "mulai">) {
    const v = useMemo(() => validasiSistem(jurnal, sampai), [jurnal, sampai]);
    return (
        <div className="space-y-6">
            <Panel
                judul="Validasi Sistem"
                kanan={<Lencana ok={v.valid} teksOk="VALID" teksTidak="TIDAK VALID" />}
            >
                <p className="-mt-2 mb-4 text-xs text-gray-500">
                    Pemeriksaan silang antar tahapan — per {tanggalID(sampai)}, dihitung sejak awal pembukuan. Semua laporan bersumber dari daftar jurnal yang sama.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <Kepala>Pemeriksaan</Kepala>
                                <Kepala kanan>Nilai 1</Kepala>
                                <Kepala kanan>Nilai 2</Kepala>
                                <Kepala kanan>Selisih</Kepala>
                                <Kepala>Status</Kepala>
                            </tr>
                        </thead>
                        <tbody>
                            {v.cek.map((c) => {
                                const uang = c.id !== "jurnal_seimbang" && c.id !== "saldo_abnormal";
                                const f = (n: number) => (uang ? rp(n) : String(n));
                                return (
                                    <tr key={c.id} className="border-b border-gray-50 align-top">
                                        <Sel>
                                            <p className="font-medium text-gray-800">{c.label}</p>
                                            <p className="text-xs text-gray-400">
                                                {c.kiriLabel} vs {c.kananLabel}
                                            </p>
                                            {!c.valid && c.detail && c.detail.length > 0 && (
                                                <ul className="mt-1 list-disc pl-4 text-xs text-red-600">
                                                    {c.detail.map((d) => (
                                                        <li key={d}>{d}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </Sel>
                                        <Sel kanan mono>{f(c.kiri)}</Sel>
                                        <Sel kanan mono>{f(c.kanan)}</Sel>
                                        <Sel kanan mono kelas={c.valid ? "" : "text-red-600"}>{f(c.selisih)}</Sel>
                                        <Sel><Lencana ok={c.valid} teksOk="Valid" teksTidak="Tidak Valid" /></Sel>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </div>
    );
}

// ── Daftar Akun (COA) ───────────────────────────────────────────────────────
export function AkunTab() {
    return (
        <Panel judul="Daftar Akun (Chart of Accounts)">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <Kepala>Kode</Kepala>
                            <Kepala>Nama Akun</Kepala>
                            <Kepala>Jenis</Kepala>
                            <Kepala>Saldo Normal</Kepala>
                            <Kepala>Keterangan</Kepala>
                        </tr>
                    </thead>
                    <tbody>
                        {AKUN.map((a) => (
                            <tr key={a.kode} className="border-b border-gray-50">
                                <Sel mono>{a.kode}</Sel>
                                <Sel kelas="font-medium">{a.nama}</Sel>
                                <Sel>{a.tipe}</Sel>
                                <Sel kelas="capitalize">{a.saldoNormal}</Sel>
                                <Sel kelas="text-gray-500">{a.keterangan}</Sel>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}
