import { AKUN, AKUN_KAS, AKUN_MAP, KODE, akunUntukKategori, type Akun, type TipeJurnalManual } from "./coa";

// ─────────────────────────────────────────────────────────────────────────────
// Tipe data
// ─────────────────────────────────────────────────────────────────────────────

export type TipeJurnal = "Umum" | "Penyesuaian";

export type JenisJurnal =
    | "Pembayaran"
    | "Biaya Midtrans"
    | "Pengakuan Pendapatan"
    | "Pengeluaran"
    | "Refund"
    | "Penarikan Saldo"
    | "Modal Awal"
    | "Penyesuaian"
    | "Jurnal Umum";

export interface BarisJurnal {
    kode: string;
    debit: number;
    kredit: number;
}

export interface Jurnal {
    id: string;
    kode: string;
    tanggal: string;
    waktu: number;
    tipe: TipeJurnal;
    jenis: JenisJurnal;
    keterangan: string;
    otomatis: boolean;
    sumber: string | null;
    baris: BarisJurnal[];
    manualId: string | null;
}

export interface SumberPembayaran {
    id: string;
    tanggal: Date;
    nominal: number;
    biayaMidtrans: number;
}

export interface SumberOrder {
    orderId: string;
    kode: string;
    statusOrder: string;
    statusPembayaran: string;
    produk: number;
    jasa: number;
    subtotalOrder: number;
    ongkirOrder: number;
    diterimaAt: Date | null;
    updatedAt: Date;
    pembayaran: SumberPembayaran[];
    refund: { status: string; tanggal: Date } | null;
}

export interface SumberPengeluaran {
    id: string;
    tanggal: Date;
    nominal: number;
    kategori: string | null;
    nama: string | null;
    deskripsi: string | null;
}

export interface SumberPenarikan {
    id: string;
    tanggal: Date;
    nominal: number;
}

export interface SumberManual {
    id: string;
    tanggal: Date;
    createdAt: Date;
    tipe: TipeJurnalManual;
    keterangan: string;
    baris: BarisJurnal[];
}

export interface SumberAkuntansi {
    order: SumberOrder[];
    pengeluaran: SumberPengeluaran[];
    penarikan: SumberPenarikan[];
    manual: SumberManual[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Util
// ─────────────────────────────────────────────────────────────────────────────

const WIB_MS = 7 * 60 * 60 * 1000;

export function tanggalWIB(d: Date): string {
    return new Date(d.getTime() + WIB_MS).toISOString().slice(0, 10);
}

export function hariSebelum(tanggal: string): string {
    const d = new Date(`${tanggal}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

const rp = (n: number) => Math.round(n);

function kodeJurnal(tipe: TipeJurnal, tanggal: string, huruf: string, id: string): string {
    const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-5).toUpperCase();
    return `${tipe === "Penyesuaian" ? "JP" : "JU"}${tanggal.replace(/-/g, "")}-${huruf}${tail}`;
}

function seimbang(baris: BarisJurnal[]): boolean {
    const d = baris.reduce((s, b) => s + b.debit, 0);
    const k = baris.reduce((s, b) => s + b.kredit, 0);
    return d === k && d > 0;
}

function buat(p: {
    id: string;
    huruf: string;
    tanggal: Date;
    tipe?: TipeJurnal;
    jenis: JenisJurnal;
    keterangan: string;
    sumber: string | null;
    baris: BarisJurnal[];
}): Jurnal | null {
    const baris = p.baris.filter((b) => b.debit > 0 || b.kredit > 0);
    if (baris.length < 2) return null;
    const tanggal = tanggalWIB(p.tanggal);
    const tipe = p.tipe ?? "Umum";
    return {
        id: p.id,
        kode: kodeJurnal(tipe, tanggal, p.huruf, p.id),
        tanggal,
        waktu: p.tanggal.getTime(),
        tipe,
        jenis: p.jenis,
        keterangan: p.keterangan,
        otomatis: true,
        sumber: p.sumber,
        baris,
        manualId: null,
    };
}

const D = (kode: string, debit: number): BarisJurnal => ({ kode, debit: rp(debit), kredit: 0 });
const K = (kode: string, kredit: number): BarisJurnal => ({ kode, debit: 0, kredit: rp(kredit) });

// ─────────────────────────────────────────────────────────────────────────────
// 1. Jurnal otomatis dari data sumber
// ─────────────────────────────────────────────────────────────────────────────

export function bangunJurnalOtomatis(src: SumberAkuntansi): { jurnal: Jurnal[]; peringatan: string[] } {
    const out: Jurnal[] = [];
    const peringatan: string[] = [];

    for (const o of src.order) jurnalOrder(o, out, peringatan);

    for (const p of src.pengeluaran) {
        const akun = akunUntukKategori(p.kategori);
        const uraian = p.nama || p.deskripsi || "Pengeluaran";
        const j = buat({
            id: `auto:png:${p.id}`,
            huruf: "K",
            tanggal: p.tanggal,
            jenis: "Pengeluaran",
            keterangan: `${p.kategori ?? "Operasional"} — ${uraian}`,
            sumber: `Pengeluaran PNG-${p.id.slice(0, 8).toUpperCase()}`,
            baris: [D(akun, p.nominal), K(KODE.KAS, p.nominal)],
        });
        if (j) out.push(j);
    }

    for (const t of src.penarikan) {
        const j = buat({
            id: `auto:tarik:${t.id}`,
            huruf: "T",
            tanggal: t.tanggal,
            jenis: "Penarikan Saldo",
            keterangan: "Penarikan saldo dari platform ke rekening jurusan",
            sumber: `Penarikan ${t.id.slice(0, 8).toUpperCase()}`,
            baris: [D(KODE.KAS, t.nominal), K(KODE.SALDO_PLATFORM, t.nominal)],
        });
        if (j) out.push(j);
    }

    for (const m of src.manual) out.push(jurnalDariManual(m));

    out.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.waktu - b.waktu || a.kode.localeCompare(b.kode));
    return { jurnal: out, peringatan };
}

export function jurnalDariManual(m: SumberManual): Jurnal {
    const tanggal = tanggalWIB(m.tanggal);
    const tipe: TipeJurnal = m.tipe === "Penyesuaian" ? "Penyesuaian" : "Umum";
    const jenis: JenisJurnal =
        m.tipe === "ModalAwal" ? "Modal Awal" : m.tipe === "Penyesuaian" ? "Penyesuaian" : "Jurnal Umum";
    return {
        id: m.id,
        kode: kodeJurnal(tipe, tanggal, "M", m.id),
        tanggal,
        waktu: new Date(`${tanggal}T00:00:00Z`).getTime() + (m.createdAt.getTime() % 86_400_000),
        tipe,
        jenis,
        keterangan: m.keterangan,
        otomatis: false,
        sumber: null,
        baris: m.baris,
        manualId: m.id,
    };
}

type Event =
    | { t: number; urut: 0; kind: "pay"; pay: SumberPembayaran }
    | { t: number; urut: 1; kind: "rec" }
    | { t: number; urut: 2; kind: "ref" };

function jurnalOrder(o: SumberOrder, out: Jurnal[], peringatan: string[]) {
    const rev = o.produk + o.jasa;
    if (rev <= 0 || o.pembayaran.length === 0) return;

    const share = o.subtotalOrder > 0 ? Math.min(1, rev / o.subtotalOrder) : 1;
    const ongkirJ = rp(o.ongkirOrder * share);
    const sumber = `Pesanan ${o.kode}`;

    const diterima = o.statusOrder === "Diterima" || o.statusOrder === "Selesai";
    const recTime = diterima ? (o.diterimaAt ?? o.updatedAt).getTime() : null;
    const refundTime = o.refund?.status === "Disetujui" ? o.refund.tanggal.getTime() : null;

    const events: Event[] = o.pembayaran.map((p) => ({ t: p.tanggal.getTime(), urut: 0, kind: "pay", pay: p }) as Event);
    if (recTime !== null) events.push({ t: recTime, urut: 1, kind: "rec" });
    if (refundTime !== null) events.push({ t: refundTime, urut: 2, kind: "ref" });
    events.sort((a, b) => a.t - b.t || a.urut - b.urut);

    let pdm = 0;
    let piutang = 0;
    let ongkirMasuk = 0;
    let pendapatanMasuk = 0;
    let diakui = false;
    let direfund = false;

    for (const ev of events) {
        if (ev.kind === "pay") {
            const nominal = rp(ev.pay.nominal * share);
            const biaya = rp(ev.pay.biayaMidtrans * share);
            const bagOngkir = Math.max(0, Math.min(nominal, ongkirJ - ongkirMasuk));
            const bagPendapatan = nominal - bagOngkir;

            const baris: BarisJurnal[] = [D(KODE.SALDO_PLATFORM, nominal)];
            if (bagOngkir > 0) baris.push(K(KODE.UTANG_ONGKIR, bagOngkir));
            let keDiPiutang = 0;
            if (diakui && piutang > 0) keDiPiutang = Math.min(bagPendapatan, piutang);
            if (keDiPiutang > 0) baris.push(K(KODE.PIUTANG, keDiPiutang));
            const keDiPdm = bagPendapatan - keDiPiutang;
            if (keDiPdm > 0) baris.push(K(KODE.PDM, keDiPdm));

            const j1 = buat({
                id: `auto:pay:${ev.pay.id}`,
                huruf: "P",
                tanggal: ev.pay.tanggal,
                jenis: "Pembayaran",
                keterangan: `Pembayaran ${sumber.toLowerCase()}`,
                sumber,
                baris,
            });
            if (j1) out.push(j1);

            if (biaya > 0) {
                const j2 = buat({
                    id: `auto:fee:${ev.pay.id}`,
                    huruf: "F",
                    tanggal: ev.pay.tanggal,
                    jenis: "Biaya Midtrans",
                    keterangan: `Biaya Midtrans ${sumber.toLowerCase()}`,
                    sumber,
                    baris: [D(KODE.BEBAN_MIDTRANS, biaya), K(KODE.SALDO_PLATFORM, biaya)],
                });
                if (j2) out.push(j2);
            }

            ongkirMasuk += bagOngkir;
            pendapatanMasuk += bagPendapatan;
            pdm += keDiPdm;
            piutang -= keDiPiutang;
        } else if (ev.kind === "rec") {
            if (direfund || diakui) continue;
            const dariPdm = Math.min(pdm, rev);
            const sisaPiutang = rev - dariPdm;
            const baris: BarisJurnal[] = [];
            if (dariPdm > 0) baris.push(D(KODE.PDM, dariPdm));
            if (sisaPiutang > 0) baris.push(D(KODE.PIUTANG, sisaPiutang));
            if (o.produk > 0) baris.push(K(KODE.PENJUALAN, o.produk));
            if (o.jasa > 0) baris.push(K(KODE.PENDAPATAN_JASA, o.jasa));
            const j = buat({
                id: `auto:rec:${o.orderId}`,
                huruf: "R",
                tanggal: new Date(ev.t),
                tipe: "Penyesuaian",
                jenis: "Pengakuan Pendapatan",
                keterangan: `Pengakuan pendapatan ${sumber.toLowerCase()} (barang/jasa sudah diterima)`,
                sumber,
                baris,
            });
            if (j) out.push(j);
            pdm -= dariPdm;
            piutang += sisaPiutang;
            diakui = true;
        } else {
            const baris: BarisJurnal[] = [];
            let kasKeluar = 0;
            if (diakui) {
                baris.push(D(KODE.RETUR, rev));
                if (piutang > 0) baris.push(K(KODE.PIUTANG, piutang));
                kasKeluar += rev - piutang;
                piutang = 0;
                diakui = false;
            } else if (pdm > 0) {
                baris.push(D(KODE.PDM, pdm));
                kasKeluar += pdm;
            }
            if (ongkirMasuk > 0) {
                baris.push(D(KODE.UTANG_ONGKIR, ongkirMasuk));
                kasKeluar += ongkirMasuk;
            }
            if (kasKeluar > 0) baris.push(K(KODE.SALDO_PLATFORM, kasKeluar));
            const j = buat({
                id: `auto:ref:${o.orderId}`,
                huruf: "X",
                tanggal: new Date(ev.t),
                jenis: "Refund",
                keterangan: `Refund ${sumber.toLowerCase()}`,
                sumber,
                baris,
            });
            if (j) out.push(j);
            pdm = 0;
            ongkirMasuk = 0;
            pendapatanMasuk = 0;
            direfund = true;
        }
    }

    if (o.statusOrder === "Dibatalkan" && !direfund && pdm + ongkirMasuk > 0) {
        peringatan.push(`Pesanan ${o.kode} berstatus Dibatalkan tetapi pembayarannya belum di-refund (Rp ${(pdm + ongkirMasuk).toLocaleString("id-ID")} masih tertahan sebagai kewajiban).`);
    }
    void pendapatanMasuk;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Validasi jurnal manual (dipakai API & form)
// ─────────────────────────────────────────────────────────────────────────────

export function validasiBarisManual(input: unknown): { ok: true; baris: BarisJurnal[] } | { ok: false; error: string } {
    if (!Array.isArray(input) || input.length < 2) return { ok: false, error: "Jurnal minimal memiliki 2 baris (debit dan kredit)." };
    const baris: BarisJurnal[] = [];
    for (const raw of input) {
        const kode = String((raw as BarisJurnal)?.kode ?? "");
        const debit = Number((raw as BarisJurnal)?.debit ?? 0);
        const kredit = Number((raw as BarisJurnal)?.kredit ?? 0);
        if (!AKUN_MAP[kode]) return { ok: false, error: `Akun ${kode || "(kosong)"} tidak dikenal.` };
        if (!Number.isInteger(debit) || !Number.isInteger(kredit) || debit < 0 || kredit < 0) return { ok: false, error: "Nominal harus bilangan bulat tidak negatif." };
        if (debit > 0 && kredit > 0) return { ok: false, error: "Satu baris tidak boleh berisi debit dan kredit sekaligus." };
        if (debit === 0 && kredit === 0) continue;
        baris.push({ kode, debit, kredit });
    }
    if (baris.length < 2) return { ok: false, error: "Jurnal minimal memiliki 2 baris yang bernilai." };
    if (!seimbang(baris)) {
        const d = baris.reduce((s, b) => s + b.debit, 0);
        const k = baris.reduce((s, b) => s + b.kredit, 0);
        return { ok: false, error: `Jurnal tidak seimbang: total debit ${d.toLocaleString("id-ID")} ≠ total kredit ${k.toLocaleString("id-ID")}.` };
    }
    return { ok: true, baris };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Saldo, Buku Besar, Neraca Saldo
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterJurnal {
    mulai?: string;
    sampai?: string;
    tanpaPenyesuaian?: boolean;
}

export function saring(jurnal: Jurnal[], f: FilterJurnal = {}): Jurnal[] {
    return jurnal.filter(
        (j) => (!f.mulai || j.tanggal >= f.mulai) && (!f.sampai || j.tanggal <= f.sampai) && !(f.tanpaPenyesuaian && j.tipe === "Penyesuaian"),
    );
}

export type TotalAkun = Record<string, { debit: number; kredit: number }>;

export function totalPerAkun(jurnal: Jurnal[], f: FilterJurnal = {}): TotalAkun {
    const total: TotalAkun = {};
    for (const j of saring(jurnal, f)) {
        for (const b of j.baris) {
            const t = (total[b.kode] ??= { debit: 0, kredit: 0 });
            t.debit += b.debit;
            t.kredit += b.kredit;
        }
    }
    return total;
}

export function saldoAkun(total: TotalAkun, kode: string): number {
    const t = total[kode];
    if (!t) return 0;
    return AKUN_MAP[kode]?.saldoNormal === "kredit" ? t.kredit - t.debit : t.debit - t.kredit;
}

export interface BarisBukuBesar {
    tanggal: string;
    kodeJurnal: string;
    keterangan: string;
    debit: number;
    kredit: number;
    saldo: number;
}

export interface BukuBesar {
    akun: Akun;
    saldoAwal: number;
    mutasi: BarisBukuBesar[];
    totalDebit: number;
    totalKredit: number;
    saldoAkhir: number;
}

export function bukuBesar(jurnal: Jurnal[], kode: string, f: { mulai?: string; sampai?: string } = {}): BukuBesar {
    const akun = AKUN_MAP[kode];
    const awalTotal = f.mulai ? totalPerAkun(jurnal, { sampai: hariSebelum(f.mulai) }) : {};
    const saldoAwal = saldoAkun(awalTotal, kode);
    const kredit = akun.saldoNormal === "kredit";

    let berjalan = saldoAwal;
    let totalDebit = 0;
    let totalKredit = 0;
    const mutasi: BarisBukuBesar[] = [];
    const urut = [...saring(jurnal, { mulai: f.mulai, sampai: f.sampai })].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.waktu - b.waktu);
    for (const j of urut) {
        const debit = j.baris.filter((b) => b.kode === kode).reduce((s, b) => s + b.debit, 0);
        const kr = j.baris.filter((b) => b.kode === kode).reduce((s, b) => s + b.kredit, 0);
        if (debit === 0 && kr === 0) continue;
        berjalan += kredit ? kr - debit : debit - kr;
        totalDebit += debit;
        totalKredit += kr;
        mutasi.push({ tanggal: j.tanggal, kodeJurnal: j.kode, keterangan: j.keterangan, debit, kredit: kr, saldo: berjalan });
    }
    return { akun, saldoAwal, mutasi, totalDebit, totalKredit, saldoAkhir: berjalan };
}

export interface BarisNeracaSaldo {
    akun: Akun;
    mutasiDebit: number;
    mutasiKredit: number;
    saldoDebit: number;
    saldoKredit: number;
    abnormal: boolean;
    catatan: string | null;
}

export interface NeracaSaldo {
    baris: BarisNeracaSaldo[];
    totalDebit: number;
    totalKredit: number;
    selisih: number;
    seimbang: boolean;
    jumlahAbnormal: number;
}

export function neracaSaldo(jurnal: Jurnal[], f: { sampai?: string; tanpaPenyesuaian?: boolean } = {}): NeracaSaldo {
    const total = totalPerAkun(jurnal, f);
    const baris: BarisNeracaSaldo[] = [];
    for (const akun of AKUN) {
        const t = total[akun.kode];
        if (!t || (t.debit === 0 && t.kredit === 0)) continue;
        const net = t.debit - t.kredit;
        const abnormal = (akun.saldoNormal === "debit" && net < 0) || (akun.saldoNormal === "kredit" && net > 0);
        baris.push({
            akun,
            mutasiDebit: t.debit,
            mutasiKredit: t.kredit,
            saldoDebit: net > 0 ? net : 0,
            saldoKredit: net < 0 ? -net : 0,
            abnormal,
            catatan: abnormal
                ? `${akun.nama} seharusnya bersaldo ${akun.saldoNormal}, tetapi saldonya di sisi ${akun.saldoNormal === "debit" ? "kredit" : "debit"} — periksa jurnal terkait.`
                : null,
        });
    }
    const totalDebit = baris.reduce((s, b) => s + b.saldoDebit, 0);
    const totalKredit = baris.reduce((s, b) => s + b.saldoKredit, 0);
    return {
        baris,
        totalDebit,
        totalKredit,
        selisih: totalDebit - totalKredit,
        seimbang: totalDebit === totalKredit,
        jumlahAbnormal: baris.filter((b) => b.abnormal).length,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Laporan keuangan
// ─────────────────────────────────────────────────────────────────────────────

export interface LabaRugi {
    mulai: string | null;
    sampai: string;
    penjualanProduk: number;
    pendapatanJasa: number;
    retur: number;
    pendapatanBersih: number;
    persediaanAwal: number;
    pembelian: number;
    persediaanAkhir: number;
    hpp: number;
    selisihHpp: number;
    labaKotor: number;
    bebanGaji: number;
    bebanOperasional: number;
    bebanLainnya: number;
    totalBebanOperasional: number;
    bebanMidtrans: number;
    labaBersih: number;
    marginKotorPersen: number;
    marginBersihPersen: number;
}

export function labaRugi(jurnal: Jurnal[], f: { mulai?: string; sampai: string }): LabaRugi {
    const periode = totalPerAkun(jurnal, { mulai: f.mulai, sampai: f.sampai });
    const s = (kode: string) => saldoAkun(periode, kode);

    const penjualanProduk = s(KODE.PENJUALAN);
    const pendapatanJasa = s(KODE.PENDAPATAN_JASA);
    const retur = s(KODE.RETUR);
    const pendapatanBersih = penjualanProduk + pendapatanJasa - retur;

    const awalTotal = f.mulai ? totalPerAkun(jurnal, { sampai: hariSebelum(f.mulai) }) : {};
    const akhirTotal = totalPerAkun(jurnal, { sampai: f.sampai });
    const persediaanAwal = saldoAkun(awalTotal, KODE.PERSEDIAAN);
    const persediaanAkhir = saldoAkun(akhirTotal, KODE.PERSEDIAAN);

    const pembelian = saldoAkun(totalPerAkun(jurnal, { mulai: f.mulai, sampai: f.sampai, tanpaPenyesuaian: true }), KODE.PEMBELIAN);
    const hpp = s(KODE.PEMBELIAN);
    const selisihHpp = persediaanAwal + pembelian - persediaanAkhir - hpp;

    const labaKotor = pendapatanBersih - hpp;
    const bebanGaji = s(KODE.BEBAN_GAJI);
    const bebanOperasional = s(KODE.BEBAN_OPERASIONAL);
    const bebanLainnya = s(KODE.BEBAN_LAINNYA);
    const totalBebanOperasional = bebanGaji + bebanOperasional + bebanLainnya;
    const bebanMidtrans = s(KODE.BEBAN_MIDTRANS);
    const labaBersih = labaKotor - totalBebanOperasional - bebanMidtrans;

    const persen = (a: number, b: number) => (b !== 0 ? Math.round((a / b) * 10000) / 100 : 0);
    return {
        mulai: f.mulai ?? null,
        sampai: f.sampai,
        penjualanProduk,
        pendapatanJasa,
        retur,
        pendapatanBersih,
        persediaanAwal,
        pembelian,
        persediaanAkhir,
        hpp,
        selisihHpp,
        labaKotor,
        bebanGaji,
        bebanOperasional,
        bebanLainnya,
        totalBebanOperasional,
        bebanMidtrans,
        labaBersih,
        marginKotorPersen: persen(labaKotor, pendapatanBersih),
        marginBersihPersen: persen(labaBersih, pendapatanBersih),
    };
}

export interface PerubahanEkuitas {
    mulai: string | null;
    sampai: string;
    ekuitasAwal: number;
    tambahanModal: number;
    labaBersih: number;
    prive: number;
    ekuitasAkhir: number;
}

function ekuitasPer(jurnal: Jurnal[], sampai: string): number {
    const t = totalPerAkun(jurnal, { sampai });
    const lr = labaRugi(jurnal, { sampai });
    return saldoAkun(t, KODE.MODAL) - saldoAkun(t, KODE.PRIVE) + lr.labaBersih;
}

export function perubahanEkuitas(jurnal: Jurnal[], f: { mulai?: string; sampai: string }): PerubahanEkuitas {
    const ekuitasAwal = f.mulai ? ekuitasPer(jurnal, hariSebelum(f.mulai)) : 0;
    const periode = totalPerAkun(jurnal, { mulai: f.mulai, sampai: f.sampai });
    const tambahanModal = saldoAkun(periode, KODE.MODAL);
    const prive = saldoAkun(periode, KODE.PRIVE);
    const laba = labaRugi(jurnal, f).labaBersih;
    return {
        mulai: f.mulai ?? null,
        sampai: f.sampai,
        ekuitasAwal,
        tambahanModal,
        labaBersih: laba,
        prive,
        ekuitasAkhir: ekuitasAwal + tambahanModal + laba - prive,
    };
}

export interface BarisNeraca {
    kode: string;
    nama: string;
    saldo: number;
}

export interface Neraca {
    sampai: string;
    aset: BarisNeraca[];
    totalAset: number;
    kewajiban: BarisNeraca[];
    totalKewajiban: number;
    modal: BarisNeraca[];
    labaBerjalan: number;
    totalEkuitas: number;
    totalKewajibanEkuitas: number;
    selisih: number;
    seimbang: boolean;
    totalKas: number;
}

export function neraca(jurnal: Jurnal[], f: { sampai: string }): Neraca {
    const t = totalPerAkun(jurnal, { sampai: f.sampai });
    const per = (tipe: Akun["tipe"]): BarisNeraca[] =>
        AKUN.filter((a) => a.tipe === tipe)
            .map((a) => {
                const saldo = saldoAkun(t, a.kode);
                const tampil = a.tipe === "Ekuitas" && a.saldoNormal === "debit" ? -saldo : saldo;
                return { kode: a.kode, nama: a.nama, saldo: tampil };
            })
            .filter((b) => b.saldo !== 0);

    const aset = per("Aset");
    const kewajiban = per("Kewajiban");
    const modal = per("Ekuitas");
    const labaBerjalan = labaRugi(jurnal, { sampai: f.sampai }).labaBersih;
    const totalAset = aset.reduce((s, b) => s + b.saldo, 0);
    const totalKewajiban = kewajiban.reduce((s, b) => s + b.saldo, 0);
    const totalEkuitas = modal.reduce((s, b) => s + b.saldo, 0) + labaBerjalan;
    const totalKewajibanEkuitas = totalKewajiban + totalEkuitas;
    const selisih = totalAset - totalKewajibanEkuitas;
    return {
        sampai: f.sampai,
        aset,
        totalAset,
        kewajiban,
        totalKewajiban,
        modal,
        labaBerjalan,
        totalEkuitas,
        totalKewajibanEkuitas,
        selisih,
        seimbang: selisih === 0,
        totalKas: AKUN_KAS.reduce((s, k) => s + saldoAkun(t, k), 0),
    };
}

// ── Arus Kas ─────

export interface ItemArusKas {
    label: string;
    masuk: number;
    keluar: number;
    bersih: number;
}

export interface AktivitasArusKas {
    items: ItemArusKas[];
    masuk: number;
    keluar: number;
    bersih: number;
}

export interface ArusKas {
    mulai: string | null;
    sampai: string;
    saldoAwal: number;
    operasi: AktivitasArusKas;
    investasi: AktivitasArusKas;
    pendanaan: AktivitasArusKas;
    arusBersih: number;
    saldoAkhir: number;
}

const LABEL_LAWAN: [string, string][] = [
    [KODE.PEMBELIAN, "Pembelian bahan baku"],
    [KODE.BEBAN_GAJI, "Pembayaran gaji karyawan"],
    [KODE.BEBAN_OPERASIONAL, "Pembayaran beban operasional"],
    [KODE.BEBAN_LAINNYA, "Pembayaran beban lainnya"],
    [KODE.BEBAN_MIDTRANS, "Pembayaran biaya Midtrans"],
    [KODE.BEBAN_DIMUKA, "Pembayaran beban dibayar di muka"],
    [KODE.UTANG_AKRUAL, "Pelunasan utang beban"],
    [KODE.UTANG_ONGKIR, "Pembayaran ongkir ke kurir"],
    [KODE.PERSEDIAAN, "Pembelian persediaan"],
    [KODE.PDM, "Penerimaan dari pelanggan"],
    [KODE.PIUTANG, "Penerimaan piutang pelanggan"],
    [KODE.PENJUALAN, "Penerimaan dari pelanggan"],
    [KODE.PENDAPATAN_JASA, "Penerimaan dari pelanggan"],
];

function klasifikasiKas(j: Jurnal): { aktivitas: "operasi" | "pendanaan"; label: string } | null {
    const lawan = j.baris.filter((b) => !(AKUN_KAS as readonly string[]).includes(b.kode));
    if (lawan.length === 0) return null;
    if (lawan.some((b) => b.kode.startsWith("3"))) {
        return { aktivitas: "pendanaan", label: lawan.some((b) => b.kode === KODE.PRIVE) ? "Prive / penarikan dana jurusan" : "Modal awal / tambahan modal" };
    }
    if (j.jenis === "Refund") return { aktivitas: "operasi", label: "Refund kepada pembeli" };
    if (j.jenis === "Pembayaran") return { aktivitas: "operasi", label: "Penerimaan dari pelanggan (termasuk ongkir)" };
    if (j.jenis === "Biaya Midtrans") return { aktivitas: "operasi", label: "Pembayaran biaya Midtrans" };
    for (const [kode, label] of LABEL_LAWAN) {
        if (lawan.some((b) => b.kode === kode)) return { aktivitas: "operasi", label };
    }
    return { aktivitas: "operasi", label: "Kas masuk/keluar lainnya" };
}

export function arusKas(jurnal: Jurnal[], f: { mulai?: string; sampai: string }): ArusKas {
    const kasSaldo = (sampai: string) => {
        const t = totalPerAkun(jurnal, { sampai });
        return AKUN_KAS.reduce((s, k) => s + saldoAkun(t, k), 0);
    };
    const saldoAwal = f.mulai ? kasSaldo(hariSebelum(f.mulai)) : 0;

    const kosong = (): AktivitasArusKas => ({ items: [], masuk: 0, keluar: 0, bersih: 0 });
    const hasil = { operasi: kosong(), investasi: kosong(), pendanaan: kosong() };
    const peta = new Map<string, ItemArusKas>();

    for (const j of saring(jurnal, { mulai: f.mulai, sampai: f.sampai })) {
        const delta = j.baris.filter((b) => (AKUN_KAS as readonly string[]).includes(b.kode)).reduce((s, b) => s + b.debit - b.kredit, 0);
        if (delta === 0) continue;
        const kl = klasifikasiKas(j);
        if (!kl) continue;
        const kunci = `${kl.aktivitas}|${kl.label}`;
        const item = peta.get(kunci) ?? { label: kl.label, masuk: 0, keluar: 0, bersih: 0 };
        if (delta > 0) item.masuk += delta;
        else item.keluar += -delta;
        item.bersih = item.masuk - item.keluar;
        peta.set(kunci, item);
    }
    for (const [kunci, item] of peta) {
        const akt = kunci.split("|")[0] as "operasi" | "pendanaan";
        hasil[akt].items.push(item);
    }
    for (const a of Object.values(hasil)) {
        a.items.sort((x, y) => y.bersih - x.bersih);
        a.masuk = a.items.reduce((s, i) => s + i.masuk, 0);
        a.keluar = a.items.reduce((s, i) => s + i.keluar, 0);
        a.bersih = a.masuk - a.keluar;
    }
    const arusBersih = hasil.operasi.bersih + hasil.investasi.bersih + hasil.pendanaan.bersih;
    return { mulai: f.mulai ?? null, sampai: f.sampai, saldoAwal, ...hasil, arusBersih, saldoAkhir: saldoAwal + arusBersih };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Validasi sistem (indikator Valid / Tidak Valid)
// ─────────────────────────────────────────────────────────────────────────────

export interface CekValidasi {
    id: string;
    label: string;
    kiriLabel: string;
    kiri: number;
    kananLabel: string;
    kanan: number;
    selisih: number;
    valid: boolean;
    detail?: string[];
}

export interface HasilValidasi {
    sampai: string;
    cek: CekValidasi[];
    valid: boolean;
}

export function validasiSistem(jurnal: Jurnal[], sampai: string): HasilValidasi {
    const semua = saring(jurnal, { sampai });
    const tidakSeimbang = semua.filter((j) => !seimbang(j.baris));

    const nsAwal = neracaSaldo(jurnal, { sampai, tanpaPenyesuaian: true });
    const nsSesuai = neracaSaldo(jurnal, { sampai });
    const nr = neraca(jurnal, { sampai });
    const lr = labaRugi(jurnal, { sampai });
    const eq = perubahanEkuitas(jurnal, { sampai });
    const ak = arusKas(jurnal, { sampai });

    const cek: CekValidasi[] = [
        {
            id: "jurnal_seimbang",
            label: "Setiap jurnal: Debit = Kredit",
            kiriLabel: "Jurnal seimbang",
            kiri: semua.length - tidakSeimbang.length,
            kananLabel: "Total jurnal",
            kanan: semua.length,
            selisih: tidakSeimbang.length,
            valid: tidakSeimbang.length === 0,
            detail: tidakSeimbang.map((j) => `${j.kode} — ${j.keterangan}`),
        },
        {
            id: "neraca_saldo",
            label: "Neraca Saldo (sebelum penyesuaian): Σ Debit = Σ Kredit",
            kiriLabel: "Total Debit",
            kiri: nsAwal.totalDebit,
            kananLabel: "Total Kredit",
            kanan: nsAwal.totalKredit,
            selisih: nsAwal.selisih,
            valid: nsAwal.seimbang,
        },
        {
            id: "neraca_saldo_disesuaikan",
            label: "Neraca Saldo Disesuaikan: Σ Debit = Σ Kredit",
            kiriLabel: "Total Debit",
            kiri: nsSesuai.totalDebit,
            kananLabel: "Total Kredit",
            kanan: nsSesuai.totalKredit,
            selisih: nsSesuai.selisih,
            valid: nsSesuai.seimbang,
        },
        {
            id: "aset_kewajiban_ekuitas",
            label: "Neraca: Aset = Liabilitas + Ekuitas",
            kiriLabel: "Total Aset",
            kiri: nr.totalAset,
            kananLabel: "Kewajiban + Ekuitas",
            kanan: nr.totalKewajibanEkuitas,
            selisih: nr.selisih,
            valid: nr.seimbang,
        },
        {
            id: "laba_rugi_neraca",
            label: "Laba Rugi = Laba Berjalan di Neraca (sejak awal pembukuan)",
            kiriLabel: "Laba Bersih (Laba Rugi)",
            kiri: lr.labaBersih,
            kananLabel: "Laba Berjalan (Neraca)",
            kanan: nr.labaBerjalan,
            selisih: lr.labaBersih - nr.labaBerjalan,
            valid: lr.labaBersih === nr.labaBerjalan,
        },
        {
            id: "ekuitas_akhir",
            label: "Ekuitas Akhir = Ekuitas Awal + Laba − Prive (+ tambahan modal)",
            kiriLabel: "Ekuitas Akhir (perhitungan)",
            kiri: eq.ekuitasAkhir,
            kananLabel: "Total Ekuitas (Neraca)",
            kanan: nr.totalEkuitas,
            selisih: eq.ekuitasAkhir - nr.totalEkuitas,
            valid: eq.ekuitasAkhir === nr.totalEkuitas,
        },
        {
            id: "kas_arus_kas_neraca",
            label: "Saldo Kas Akhir (Arus Kas) = Kas di Neraca",
            kiriLabel: "Saldo Kas Akhir",
            kiri: ak.saldoAkhir,
            kananLabel: "Kas di Neraca",
            kanan: nr.totalKas,
            selisih: ak.saldoAkhir - nr.totalKas,
            valid: ak.saldoAkhir === nr.totalKas,
        },
        {
            id: "hpp_persediaan",
            label: "HPP = Persediaan Awal + Pembelian − Persediaan Akhir",
            kiriLabel: "HPP (jurnal)",
            kiri: lr.hpp,
            kananLabel: "Awal + Pembelian − Akhir",
            kanan: lr.persediaanAwal + lr.pembelian - lr.persediaanAkhir,
            selisih: lr.selisihHpp === 0 ? 0 : -lr.selisihHpp,
            valid: lr.selisihHpp === 0,
        },
        {
            id: "saldo_abnormal",
            label: "Tidak ada akun dengan saldo abnormal",
            kiriLabel: "Akun abnormal",
            kiri: nsSesuai.jumlahAbnormal,
            kananLabel: "Seharusnya",
            kanan: 0,
            selisih: nsSesuai.jumlahAbnormal,
            valid: nsSesuai.jumlahAbnormal === 0,
            detail: nsSesuai.baris.filter((b) => b.abnormal).map((b) => b.catatan ?? b.akun.nama),
        },
    ];

    return { sampai, cek, valid: cek.every((c) => c.valid) };
}

export function saldoAkunPer(jurnal: Jurnal[], kode: string, sampai: string): number {
    return saldoAkun(totalPerAkun(jurnal, { sampai }), kode);
}
export function tanggalAwalPembukuan(jurnal: Jurnal[]): string | null {
    return jurnal.length ? jurnal.reduce((min, j) => (j.tanggal < min ? j.tanggal : min), jurnal[0].tanggal) : null;
}
