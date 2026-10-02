import ExcelJS from "exceljs";
import { AKUN } from "@/lib/akuntansi/coa";
import {
    arusKas,
    bukuBesar,
    labaRugi,
    neraca,
    neracaSaldo,
    perubahanEkuitas,
    saring,
    type AktivitasArusKas,
    type Jurnal,
} from "@/lib/akuntansi/engine";
import { toDateInputValue } from "@/lib/utils/tanggal";

// ─────────────────────────────────────────────────────────────────────────────
// Definisi laporan yang bisa diunduh (dipakai dialog di LaporanKeuanganClient)
// ─────────────────────────────────────────────────────────────────────────────

export type KunciLaporan =
    | "laba-rugi"
    | "perubahan-ekuitas"
    | "neraca"
    | "arus-kas"
    | "jurnal-umum"
    | "buku-besar"
    | "neraca-saldo"
    | "jurnal-penyesuaian"
    | "neraca-saldo-disesuaikan"
    | "transaksi";

export const DAFTAR_LAPORAN: { kelompok: string; item: { kunci: KunciLaporan; label: string }[] }[] = [
    {
        kelompok: "Laporan Keuangan Utama",
        item: [
            { kunci: "laba-rugi", label: "Laba Rugi" },
            { kunci: "perubahan-ekuitas", label: "Perubahan Ekuitas" },
            { kunci: "neraca", label: "Neraca" },
            { kunci: "arus-kas", label: "Arus Kas" },
        ],
    },
    {
        kelompok: "Siklus Akuntansi",
        item: [
            { kunci: "jurnal-umum", label: "Jurnal Umum" },
            { kunci: "buku-besar", label: "Buku Besar" },
            { kunci: "neraca-saldo", label: "Neraca Saldo (Sebelum Penyesuaian)" },
            { kunci: "jurnal-penyesuaian", label: "Jurnal Penyesuaian" },
            { kunci: "neraca-saldo-disesuaikan", label: "Neraca Saldo Disesuaikan" },
        ],
    },
    {
        kelompok: "Data Transaksi",
        item: [{ kunci: "transaksi", label: "Daftar Transaksi (Pemasukan & Pengeluaran)" }],
    },
];

export const SEMUA_KUNCI_LAPORAN: KunciLaporan[] = DAFTAR_LAPORAN.flatMap((g) => g.item.map((i) => i.kunci));

export interface SumberJurusan {
    id: string;
    nama: string;
    jurnal: Jurnal[];
    peringatan?: string[];
}

export interface TransaksiUnduh {
    noInvoice: string;
    tanggal: string;
    pembeliPemasok: string;
    jurusan: string;
    jenisTransaksi: string;
    kategori: string;
    deskripsi: string;
    varianLabel?: string;
    hargaSatuan: number;
    total: number;
    metodePembayaran: string;
    statusSettlement: string;
}

export interface OpsiUnduh {
    namaSmk: string;
    jurusan: SumberJurusan[];
    namaCakupan: string;
    mulai: string;
    sampai: string;
    laporan: KunciLaporan[];
    transaksi: TransaksiUnduh[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Util tampilan Excel
// ─────────────────────────────────────────────────────────────────────────────

const BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFB0B0B0" } },
    left: { style: "thin", color: { argb: "FFB0B0B0" } },
    bottom: { style: "thin", color: { argb: "FFB0B0B0" } },
    right: { style: "thin", color: { argb: "FFB0B0B0" } },
};
const FMT_ANGKA = "#,##0;(#,##0);-";
const BIRU = "FF0EA5E9";
const BIRU_TUA = "FF0369A1";

interface Lembar {
    ws: ExcelJS.Worksheet;
    r: number;
    kolom: number;
}

function tanggalIndo(s: string): string {
    if (!s) return "";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
}

function labelPeriode(o: OpsiUnduh): string {
    return o.mulai
        ? `Periode ${tanggalIndo(o.mulai)} s.d. ${tanggalIndo(o.sampai)}`
        : `Per ${tanggalIndo(o.sampai)} (sejak awal pembukuan)`;
}

function buatLembar(wb: ExcelJS.Workbook, o: OpsiUnduh, nama: string, judul: string, lebar: number[], denganPeriode = true): Lembar {
    const ws = wb.addWorksheet(nama.slice(0, 31), {
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    ws.columns = lebar.map((width) => ({ width }));
    const kolom = lebar.length;
    const baris: [string, Partial<ExcelJS.Font>][] = [
        [judul.toUpperCase(), { bold: true, size: 14 }],
        [`${o.namaSmk} — ${o.namaCakupan}`, { bold: true, size: 11 }],
        [denganPeriode ? labelPeriode(o) : `Per ${tanggalIndo(o.sampai)}`, { italic: true, size: 10, color: { argb: "FF666666" } }],
    ];
    baris.forEach(([teks, font], i) => {
        ws.mergeCells(i + 1, 1, i + 1, kolom);
        const c = ws.getCell(i + 1, 1);
        c.value = teks;
        c.font = font;
        c.alignment = { horizontal: "center" };
    });
    return { ws, r: 5, kolom };
}

function tulisHeader(l: Lembar, judulKolom: string[], angka: number[] = []) {
    judulKolom.forEach((h, i) => {
        const c = l.ws.getCell(l.r, i + 1);
        c.value = h;
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU } };
        c.alignment = { horizontal: angka.includes(i) ? "right" : "center", vertical: "middle", wrapText: true };
        c.border = BORDER;
    });
    l.r++;
}

function tulisBaris(
    l: Lembar,
    nilai: (string | number | null)[],
    o: { tebal?: boolean; angka?: number[]; isi?: string; miring?: boolean } = {},
) {
    nilai.forEach((v, i) => {
        const c = l.ws.getCell(l.r, i + 1);
        c.value = v;
        c.border = BORDER;
        c.font = { bold: o.tebal, italic: o.miring };
        if (o.angka?.includes(i)) {
            c.numFmt = FMT_ANGKA;
            c.alignment = { horizontal: "right" };
        }
        if (o.isi) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: o.isi } };
    });
    l.r++;
}

function tulisBagian(l: Lembar, teks: string) {
    l.ws.mergeCells(l.r, 1, l.r, l.kolom);
    const c = l.ws.getCell(l.r, 1);
    c.value = teks;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_TUA } };
    l.r++;
}

const gabungJurnal = (o: OpsiUnduh): Jurnal[] => o.jurusan.flatMap((j) => j.jurnal);
const namaAkun = (kode: string) => AKUN.find((a) => a.kode === kode)?.nama ?? kode;
const mulaiOpt = (o: OpsiUnduh) => o.mulai || undefined;

// ─────────────────────────────────────────────────────────────────────────────
// Kolom per jurusan — saat unduh SEMUA jurusan, laporan dipecah per jurusan
// (ditambah kolom "Gabungan") supaya kelihatan mana angka jurusan 1, jurusan 2, dst.
// ─────────────────────────────────────────────────────────────────────────────

interface KolomLaporan {
    nama: string;
    judul: string;
    jurnal: Jurnal[];
}

const banyakJurusan = (o: OpsiUnduh) => o.jurusan.length > 1;

function kolomLaporan(o: OpsiUnduh): KolomLaporan[] {
    if (!banyakJurusan(o)) return [{ nama: o.namaCakupan, judul: "Jumlah (Rp)", jurnal: gabungJurnal(o) }];
    return [
        ...o.jurusan.map((j) => ({ nama: j.nama, judul: `${j.nama} (Rp)`, jurnal: j.jurnal })),
        { nama: "Gabungan Semua Jurusan", judul: "Gabungan (Rp)", jurnal: gabungJurnal(o) },
    ];
}

const kolomAngkaDari = (awal: number, jumlah: number) => Array.from({ length: jumlah }, (_, i) => awal + i);

// ─────────────────────────────────────────────────────────────────────────────
// Lembar-lembar laporan
// ─────────────────────────────────────────────────────────────────────────────

function lembarLabaRugi(wb: ExcelJS.Workbook, o: OpsiUnduh) {
    const kol = kolomLaporan(o);
    const hasil = kol.map((k) => labaRugi(k.jurnal, { mulai: mulaiOpt(o), sampai: o.sampai }));
    const l = buatLembar(wb, o, "Laba Rugi", "Laporan Laba Rugi", [46, ...kol.map(() => 20)]);
    const A = kolomAngkaDari(1, kol.length);
    tulisHeader(l, ["Keterangan", ...kol.map((k) => k.judul)], A);
    const baris = (label: string, ambil: (lr: (typeof hasil)[number]) => number, opsi: { tebal?: boolean; isi?: string } = {}) =>
        tulisBaris(l, [label, ...hasil.map(ambil)], { angka: A, ...opsi });
    tulisBagian(l, "PENDAPATAN");
    baris("Penjualan Produk", (r) => r.penjualanProduk);
    baris("Pendapatan Jasa", (r) => r.pendapatanJasa);
    baris("Retur Penjualan", (r) => -r.retur);
    baris("Pendapatan Bersih", (r) => r.pendapatanBersih, { tebal: true });
    tulisBagian(l, "HARGA POKOK PENJUALAN (HPP)");
    baris("Persediaan Awal", (r) => r.persediaanAwal);
    baris("Pembelian Bahan Baku", (r) => r.pembelian);
    baris("Persediaan Akhir", (r) => -r.persediaanAkhir);
    baris("Harga Pokok Penjualan", (r) => r.hpp, { tebal: true });
    baris("LABA KOTOR", (r) => r.labaKotor, { tebal: true, isi: "FFE0F2FE" });
    tulisBagian(l, "BEBAN OPERASIONAL");
    baris("Beban Gaji", (r) => r.bebanGaji);
    baris("Beban Operasional", (r) => r.bebanOperasional);
    baris("Beban Lainnya", (r) => r.bebanLainnya);
    baris("Total Beban Operasional", (r) => r.totalBebanOperasional, { tebal: true });
    baris("Beban Biaya Midtrans", (r) => r.bebanMidtrans);
    baris("LABA BERSIH", (r) => r.labaBersih, { tebal: true, isi: "FFE0F2FE" });
    l.r++;
    tulisBaris(l, ["Margin Laba Kotor (%)", ...hasil.map((r) => r.marginKotorPersen)], { miring: true });
    tulisBaris(l, ["Margin Laba Bersih (%)", ...hasil.map((r) => r.marginBersihPersen)], { miring: true });
}

function lembarPerubahanEkuitas(wb: ExcelJS.Workbook, o: OpsiUnduh) {
    const kol = kolomLaporan(o);
    const hasil = kol.map((k) => perubahanEkuitas(k.jurnal, { mulai: mulaiOpt(o), sampai: o.sampai }));
    const l = buatLembar(wb, o, "Perubahan Ekuitas", "Laporan Perubahan Ekuitas", [46, ...kol.map(() => 20)]);
    const A = kolomAngkaDari(1, kol.length);
    tulisHeader(l, ["Keterangan", ...kol.map((k) => k.judul)], A);
    tulisBaris(l, ["Ekuitas Awal", ...hasil.map((p) => p.ekuitasAwal)], { angka: A });
    tulisBaris(l, ["Tambahan Modal", ...hasil.map((p) => p.tambahanModal)], { angka: A });
    tulisBaris(l, ["Laba Bersih Periode", ...hasil.map((p) => p.labaBersih)], { angka: A });
    tulisBaris(l, ["Prive", ...hasil.map((p) => -p.prive)], { angka: A });
    tulisBaris(l, ["EKUITAS AKHIR", ...hasil.map((p) => p.ekuitasAkhir)], { angka: A, tebal: true, isi: "FFE0F2FE" });
}

function lembarNeraca(wb: ExcelJS.Workbook, o: OpsiUnduh) {
    type Neraca = ReturnType<typeof neraca>;
    const kol = kolomLaporan(o);
    const hasil = kol.map((k) => neraca(k.jurnal, { sampai: o.sampai }));
    const l = buatLembar(wb, o, "Neraca", "Laporan Posisi Keuangan (Neraca)", [12, 40, ...kol.map(() => 20)], false);
    const A = kolomAngkaDari(2, kol.length);
    tulisHeader(l, ["Kode", "Akun", ...kol.map((k) => k.judul)], A);

    const tulisAkun = (ambil: (n: Neraca) => { kode: string; nama: string; saldo: number }[]) => {
        const peta = new Map<string, string>();
        hasil.forEach((n) => ambil(n).forEach((b) => { if (!peta.has(b.kode)) peta.set(b.kode, b.nama); }));
        [...peta.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([kode, nama]) =>
                tulisBaris(l, [kode, nama, ...hasil.map((n) => ambil(n).find((b) => b.kode === kode)?.saldo ?? 0)], { angka: A }),
            );
    };
    const total = (label: string, ambil: (n: Neraca) => number, opsi: { tebal?: boolean; isi?: string } = { tebal: true }) =>
        tulisBaris(l, ["", label, ...hasil.map(ambil)], { angka: A, ...opsi });

    tulisBagian(l, "ASET");
    tulisAkun((n) => n.aset);
    total("Total Aset", (n) => n.totalAset, { tebal: true, isi: "FFE0F2FE" });
    tulisBagian(l, "KEWAJIBAN");
    tulisAkun((n) => n.kewajiban);
    total("Total Kewajiban", (n) => n.totalKewajiban);
    tulisBagian(l, "EKUITAS");
    tulisAkun((n) => n.modal);
    total("Laba Berjalan", (n) => n.labaBerjalan, {});
    total("Total Ekuitas", (n) => n.totalEkuitas);
    total("Total Kewajiban + Ekuitas", (n) => n.totalKewajibanEkuitas, { tebal: true, isi: "FFE0F2FE" });
    l.r++;
    tulisBaris(
        l,
        ["", "Status", ...hasil.map((n) => (n.seimbang ? "SEIMBANG" : `TIDAK seimbang (selisih ${n.selisih})`))],
        { miring: true },
    );
}

function lembarArusKas(wb: ExcelJS.Workbook, o: OpsiUnduh) {
    const kol = kolomLaporan(o);
    const hasil = kol.map((k) => arusKas(k.jurnal, { mulai: mulaiOpt(o), sampai: o.sampai }));
    const aktivitas: [string, (a: (typeof hasil)[number]) => AktivitasArusKas][] = [
        ["AKTIVITAS OPERASI", (a) => a.operasi],
        ["AKTIVITAS INVESTASI", (a) => a.investasi],
        ["AKTIVITAS PENDANAAN", (a) => a.pendanaan],
    ];

    if (!banyakJurusan(o)) {
        const ak = hasil[0];
        const l = buatLembar(wb, o, "Arus Kas", "Laporan Arus Kas", [44, 18, 18, 18]);
        tulisHeader(l, ["Keterangan", "Masuk (Rp)", "Keluar (Rp)", "Bersih (Rp)"], [1, 2, 3]);
        const A = [1, 2, 3];
        tulisBaris(l, ["Saldo Kas Awal", null, null, ak.saldoAwal], { angka: A, tebal: true });
        for (const [judul, ambil] of aktivitas) {
            const a = ambil(ak);
            tulisBagian(l, judul);
            a.items.forEach((it) => tulisBaris(l, [it.label, it.masuk, it.keluar, it.bersih], { angka: A }));
            tulisBaris(l, [`Kas bersih — ${judul.toLowerCase()}`, a.masuk, a.keluar, a.bersih], { angka: A, tebal: true });
        }
        l.r++;
        tulisBaris(l, ["Kenaikan (Penurunan) Kas Bersih", null, null, ak.arusBersih], { angka: A, tebal: true });
        tulisBaris(l, ["SALDO KAS AKHIR", null, null, ak.saldoAkhir], { angka: A, tebal: true, isi: "FFE0F2FE" });
        return;
    }

    const l = buatLembar(wb, o, "Arus Kas", "Laporan Arus Kas", [44, ...kol.map(() => 20)]);
    const A = kolomAngkaDari(1, kol.length);
    tulisHeader(l, ["Keterangan", ...kol.map((k) => k.judul)], A);
    tulisBaris(l, ["Saldo Kas Awal", ...hasil.map((a) => a.saldoAwal)], { angka: A, tebal: true });
    for (const [judul, ambil] of aktivitas) {
        tulisBagian(l, judul);
        const labels: string[] = [];
        hasil.forEach((h) => ambil(h).items.forEach((it) => { if (!labels.includes(it.label)) labels.push(it.label); }));
        labels.forEach((label) =>
            tulisBaris(l, [label, ...hasil.map((h) => ambil(h).items.find((it) => it.label === label)?.bersih ?? 0)], { angka: A }),
        );
        tulisBaris(l, [`Kas bersih — ${judul.toLowerCase()}`, ...hasil.map((h) => ambil(h).bersih)], { angka: A, tebal: true });
    }
    l.r++;
    tulisBaris(l, ["Kenaikan (Penurunan) Kas Bersih", ...hasil.map((a) => a.arusBersih)], { angka: A, tebal: true });
    tulisBaris(l, ["SALDO KAS AKHIR", ...hasil.map((a) => a.saldoAkhir)], { angka: A, tebal: true, isi: "FFE0F2FE" });
}

function lembarJurnal(wb: ExcelJS.Workbook, o: OpsiUnduh, tipe: "Umum" | "Penyesuaian") {
    const banyak = o.jurusan.length > 1;
    const judul = tipe === "Umum" ? "Jurnal Umum" : "Jurnal Penyesuaian";
    const lebar = banyak ? [12, 22, 18, 42, 34, 16, 16] : [12, 22, 46, 34, 16, 16];
    const l = buatLembar(wb, o, judul, judul, lebar);
    const kolomAngka = banyak ? [5, 6] : [4, 5];
    tulisHeader(
        l,
        banyak
            ? ["Tanggal", "Kode Jurnal", "Jurusan", "Keterangan", "Akun", "Debit (Rp)", "Kredit (Rp)"]
            : ["Tanggal", "Kode Jurnal", "Keterangan", "Akun", "Debit (Rp)", "Kredit (Rp)"],
        kolomAngka,
    );
    let totalD = 0;
    let totalK = 0;
    for (const j of o.jurusan) {
        const daftar = saring(j.jurnal, { mulai: mulaiOpt(o), sampai: o.sampai })
            .filter((x) => x.tipe === tipe)
            .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.waktu - b.waktu);
        for (const x of daftar) {
            x.baris.forEach((b, idx) => {
                totalD += b.debit;
                totalK += b.kredit;
                const akun = `${b.kode} ${b.kredit > 0 ? "   " : ""}${namaAkun(b.kode)}`;
                const dasar = idx === 0 ? [tanggalIndo(x.tanggal), x.kode] : ["", ""];
                const ket = idx === 0 ? x.keterangan : "";
                tulisBaris(
                    l,
                    banyak
                        ? [...dasar, idx === 0 ? j.nama : "", ket, akun, b.debit || null, b.kredit || null]
                        : [...dasar, ket, akun, b.debit || null, b.kredit || null],
                    { angka: kolomAngka },
                );
            });
        }
    }
    const kosong = Array(kolomAngka[0] - 1).fill("");
    tulisBaris(l, [...kosong, "TOTAL", totalD, totalK], { angka: kolomAngka, tebal: true, isi: "FFE0F2FE" });
}

function lembarBukuBesar(wb: ExcelJS.Workbook, o: OpsiUnduh) {
    const l = buatLembar(wb, o, "Buku Besar", "Buku Besar", [12, 22, 50, 16, 16, 18]);
    const A = [3, 4, 5];
    const sumber = banyakJurusan(o)
        ? o.jurusan.map((j) => ({ nama: j.nama, jurnal: j.jurnal }))
        : [{ nama: "", jurnal: gabungJurnal(o) }];
    for (const s of sumber) {
        if (s.nama) {
            l.ws.mergeCells(l.r, 1, l.r, l.kolom);
            const c = l.ws.getCell(l.r, 1);
            c.value = `JURUSAN ${s.nama.toUpperCase()}`;
            c.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF075985" } };
            l.r++;
        }
        for (const akun of AKUN) {
            const bb = bukuBesar(s.jurnal, akun.kode, { mulai: mulaiOpt(o), sampai: o.sampai });
            if (bb.mutasi.length === 0 && bb.saldoAwal === 0) continue;
            tulisBagian(l, `${akun.kode} — ${akun.nama} (${akun.tipe}, saldo normal ${akun.saldoNormal})`);
            tulisHeader(l, ["Tanggal", "Kode Jurnal", "Keterangan", "Debit (Rp)", "Kredit (Rp)", "Saldo (Rp)"], A);
            tulisBaris(l, ["", "", "Saldo awal", null, null, bb.saldoAwal], { angka: A, miring: true });
            bb.mutasi.forEach((m) =>
                tulisBaris(l, [tanggalIndo(m.tanggal), m.kodeJurnal, m.keterangan, m.debit || null, m.kredit || null, m.saldo], { angka: A }),
            );
            tulisBaris(l, ["", "", "Total / Saldo akhir", bb.totalDebit, bb.totalKredit, bb.saldoAkhir], { angka: A, tebal: true });
            l.r++;
        }
    }
}

function lembarNeracaSaldo(wb: ExcelJS.Workbook, o: OpsiUnduh, disesuaikan: boolean) {
    const judul = disesuaikan ? "Neraca Saldo Disesuaikan" : "Neraca Saldo";
    const l = buatLembar(wb, o, judul, disesuaikan ? judul : `${judul} (Sebelum Penyesuaian)`, [12, 42, 18, 18], false);
    for (const k of kolomLaporan(o)) {
        const ns = neracaSaldo(k.jurnal, { sampai: o.sampai, tanpaPenyesuaian: !disesuaikan });
        if (banyakJurusan(o)) tulisBagian(l, k.nama.toUpperCase());
        tulisHeader(l, ["Kode", "Nama Akun", "Saldo Debit (Rp)", "Saldo Kredit (Rp)"], [2, 3]);
        ns.baris.forEach((b) => {
            if (b.saldoDebit === 0 && b.saldoKredit === 0) return;
            tulisBaris(l, [b.akun.kode, b.akun.nama, b.saldoDebit || null, b.saldoKredit || null], { angka: [2, 3] });
        });
        tulisBaris(l, ["", "TOTAL", ns.totalDebit, ns.totalKredit], { angka: [2, 3], tebal: true, isi: "FFE0F2FE" });
        l.r++;
        tulisBaris(l, ["", ns.seimbang ? "Debit = Kredit (seimbang)" : `TIDAK seimbang, selisih ${ns.selisih}`, null, null], { miring: true });
        l.r += 2;
    }
}

function lembarTransaksi(wb: ExcelJS.Workbook, o: OpsiUnduh) {
    const data = o.transaksi.filter((t) => {
        const tgl = toDateInputValue(t.tanggal);
        return !!tgl && (!o.mulai || tgl >= o.mulai) && tgl <= o.sampai;
    });
    const l = buatLembar(wb, o, "Daftar Transaksi", "Daftar Transaksi", [5, 22, 12, 22, 16, 14, 14, 30, 16, 16, 16, 16, 14]);
    const A = [9, 10];
    tulisHeader(
        l,
        ["No", "No. Invoice", "Tanggal", "Pembeli/Pemasok", "Jurusan", "Jenis", "Kategori", "Deskripsi", "Varian", "Harga Satuan (Rp)", "Total (Rp)", "Metode", "Status"],
        [9, 10],
    );
    let masuk = 0;
    let keluar = 0;
    data.forEach((t, i) => {
        if (t.jenisTransaksi === "Pengeluaran") keluar += t.total;
        else if (t.statusSettlement !== "Refund") masuk += t.total;
        tulisBaris(
            l,
            [i + 1, t.noInvoice, t.tanggal, t.pembeliPemasok, t.jurusan, t.jenisTransaksi, t.kategori, t.deskripsi, t.varianLabel || "-", t.hargaSatuan || null, t.total, t.metodePembayaran, t.statusSettlement],
            { angka: [9, 10] },
        );
    });
    void A;
    l.r++;
    tulisBaris(l, ["", "", "", "", "", "", "", "", "Total Pemasukan" , null, masuk, "", ""], { angka: [10], tebal: true });
    tulisBaris(l, ["", "", "", "", "", "", "", "", "Total Pengeluaran (termasuk refund)" , null, keluar, "", ""], { angka: [10], tebal: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

const URUTAN: KunciLaporan[] = [
    "laba-rugi",
    "perubahan-ekuitas",
    "neraca",
    "arus-kas",
    "jurnal-umum",
    "buku-besar",
    "neraca-saldo",
    "jurnal-penyesuaian",
    "neraca-saldo-disesuaikan",
    "transaksi",
];

export async function unduhLaporanKeuanganExcel(o: OpsiUnduh) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "AdminSMK";
    wb.created = new Date();

    for (const kunci of URUTAN) {
        if (!o.laporan.includes(kunci)) continue;
        switch (kunci) {
            case "laba-rugi": lembarLabaRugi(wb, o); break;
            case "perubahan-ekuitas": lembarPerubahanEkuitas(wb, o); break;
            case "neraca": lembarNeraca(wb, o); break;
            case "arus-kas": lembarArusKas(wb, o); break;
            case "jurnal-umum": lembarJurnal(wb, o, "Umum"); break;
            case "buku-besar": lembarBukuBesar(wb, o); break;
            case "neraca-saldo": lembarNeracaSaldo(wb, o, false); break;
            case "jurnal-penyesuaian": lembarJurnal(wb, o, "Penyesuaian"); break;
            case "neraca-saldo-disesuaikan": lembarNeracaSaldo(wb, o, true); break;
            case "transaksi": lembarTransaksi(wb, o); break;
        }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const slug = o.namaCakupan.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-keuangan-${slug}-${o.sampai}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}