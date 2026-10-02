export type TipeAkun = "Aset" | "Kewajiban" | "Ekuitas" | "Pendapatan" | "HPP" | "Beban";
export type SaldoNormal = "debit" | "kredit";

export interface Akun {
    kode: string;
    nama: string;
    tipe: TipeAkun;
    saldoNormal: SaldoNormal;
    keterangan: string;
}

export const KODE = {
    KAS: "1110",
    SALDO_PLATFORM: "1120",
    PIUTANG: "1200",
    PERSEDIAAN: "1300",
    BEBAN_DIMUKA: "1400",
    UTANG_ONGKIR: "2100",
    PDM: "2200",
    UTANG_AKRUAL: "2300",
    MODAL: "3100",
    PRIVE: "3200",
    PENJUALAN: "4100",
    PENDAPATAN_JASA: "4200",
    RETUR: "4300",
    PEMBELIAN: "5110",
    BEBAN_GAJI: "5210",
    BEBAN_OPERASIONAL: "5220",
    BEBAN_MIDTRANS: "5230",
    BEBAN_LAINNYA: "5290",
} as const;

export const AKUN: Akun[] = [
    { kode: "1110", nama: "Kas & Bank Jurusan", tipe: "Aset", saldoNormal: "debit", keterangan: "Uang milik jurusan yang sudah ditarik/diterima langsung (dasar pembayaran pengeluaran)" },
    { kode: "1120", nama: "Saldo di Platform (Midtrans)", tipe: "Aset", saldoNormal: "debit", keterangan: "Hasil penjualan yang masih tertahan di platform dan belum ditarik" },
    { kode: "1200", nama: "Piutang Usaha", tipe: "Aset", saldoNormal: "debit", keterangan: "Tagihan jasa yang sudah selesai dikerjakan tetapi belum dilunasi pelanggan" },
    { kode: "1300", nama: "Persediaan Bahan Baku", tipe: "Aset", saldoNormal: "debit", keterangan: "Nilai bahan baku yang belum terpakai (disesuaikan lewat Jurnal Penyesuaian)" },
    { kode: "1400", nama: "Beban Dibayar di Muka", tipe: "Aset", saldoNormal: "debit", keterangan: "Beban yang sudah dibayar tetapi manfaatnya belum terpakai (mis. sewa)" },
    { kode: "2100", nama: "Utang Ongkos Kirim", tipe: "Kewajiban", saldoNormal: "kredit", keterangan: "Ongkir dari pembeli yang menjadi titipan untuk kurir (bukan pendapatan)" },
    { kode: "2200", nama: "Pendapatan Diterima di Muka", tipe: "Kewajiban", saldoNormal: "kredit", keterangan: "Pembayaran pembeli untuk pesanan yang barang/jasanya belum diterima" },
    { kode: "2300", nama: "Utang Beban (Akrual)", tipe: "Kewajiban", saldoNormal: "kredit", keterangan: "Beban yang sudah terjadi tetapi belum dibayar (mis. gaji)" },
    { kode: "3100", nama: "Modal Jurusan", tipe: "Ekuitas", saldoNormal: "kredit", keterangan: "Modal awal dan tambahan modal jurusan" },
    { kode: "3200", nama: "Prive / Penarikan Modal", tipe: "Ekuitas", saldoNormal: "debit", keterangan: "Pengambilan dana jurusan di luar operasional (pengurang ekuitas)" },
    { kode: "4100", nama: "Penjualan Produk", tipe: "Pendapatan", saldoNormal: "kredit", keterangan: "Pendapatan penjualan produk (diakui saat pesanan diterima)" },
    { kode: "4200", nama: "Pendapatan Jasa", tipe: "Pendapatan", saldoNormal: "kredit", keterangan: "Pendapatan jasa (diakui saat jasa selesai)" },
    { kode: "4300", nama: "Retur Penjualan", tipe: "Pendapatan", saldoNormal: "debit", keterangan: "Pengurang pendapatan akibat refund yang disetujui" },
    { kode: "5110", nama: "Pembelian Bahan Baku (HPP)", tipe: "HPP", saldoNormal: "debit", keterangan: "Pembelian bahan baku; bersama persediaan membentuk Harga Pokok Penjualan" },
    { kode: "5210", nama: "Beban Gaji", tipe: "Beban", saldoNormal: "debit", keterangan: "Gaji karyawan" },
    { kode: "5220", nama: "Beban Operasional", tipe: "Beban", saldoNormal: "debit", keterangan: "Beban operasional lain (listrik, air, perawatan, dll.)" },
    { kode: "5230", nama: "Beban Admin Midtrans", tipe: "Beban", saldoNormal: "debit", keterangan: "Biaya pemrosesan pembayaran Midtrans" },
    { kode: "5290", nama: "Beban Lainnya", tipe: "Beban", saldoNormal: "debit", keterangan: "Beban lain-lain" },
];

export const AKUN_MAP: Record<string, Akun> = Object.fromEntries(AKUN.map((a) => [a.kode, a]));

export const AKUN_KAS = [KODE.KAS, KODE.SALDO_PLATFORM] as const;


export const KATEGORI_KE_AKUN: Record<string, string> = {
    "Bahan Baku": KODE.PEMBELIAN,
    "Gaji Karyawan": KODE.BEBAN_GAJI,
    Operasional: KODE.BEBAN_OPERASIONAL,
    Lainnya: KODE.BEBAN_LAINNYA,
};

export function akunUntukKategori(kategori: string | null | undefined): string {
    return (kategori && KATEGORI_KE_AKUN[kategori]) || KODE.BEBAN_LAINNYA;
}

export type TipeJurnalManual = "ModalAwal" | "Penyesuaian" | "Umum";

export const PESAN_GUNAKAN_PENGELUARAN =
    "Pengeluaran (beban/pembelian yang dibayar dari Kas) dicatat lewat tombol “Pengeluaran”, bukan Jurnal Manual, agar tidak tercatat ganda.";

export function adalahPengeluaranKas(baris: { kode: string; debit: number; kredit: number }[]): boolean {
    const debitBeban = baris.some((b) => b.debit > 0 && AKUN_MAP[b.kode] && (AKUN_MAP[b.kode].tipe === "Beban" || AKUN_MAP[b.kode].tipe === "HPP"));
    const kreditKas = baris.some((b) => b.kredit > 0 && (AKUN_KAS as readonly string[]).includes(b.kode));
    return debitBeban && kreditKas;
}

export interface TemplateJurnal {
    id: string;
    tipe: TipeJurnalManual;
    label: string;
    hint: string;
    debit: string;
    kredit: string;
    persediaanAkhir?: boolean;
}

export const TEMPLATE_JURNAL: TemplateJurnal[] = [
    // ── Modal awal ──
    { id: "modal_awal", tipe: "ModalAwal", label: "Modal Awal / Tambahan Modal", hint: "Dana awal atau tambahan modal yang dimiliki jurusan.", debit: KODE.KAS, kredit: KODE.MODAL },

    // ── Jurnal umum (transaksi di luar penjualan otomatis) ──
    { id: "prive", tipe: "Umum", label: "Prive / Setoran ke Sekolah", hint: "Dana jurusan yang diambil di luar kebutuhan operasional.", debit: KODE.PRIVE, kredit: KODE.KAS },
    { id: "bayar_ongkir", tipe: "Umum", label: "Bayar Ongkir ke Kurir", hint: "Melunasi utang ongkir yang dititipkan pembeli.", debit: KODE.UTANG_ONGKIR, kredit: KODE.KAS },
    { id: "bayar_dimuka", tipe: "Umum", label: "Bayar Beban di Muka (mis. sewa)", hint: "Beban yang dibayar sekarang untuk beberapa periode ke depan.", debit: KODE.BEBAN_DIMUKA, kredit: KODE.KAS },
    { id: "lunasi_akrual", tipe: "Umum", label: "Lunasi Utang Beban (Akrual)", hint: "Pembayaran beban yang sebelumnya sudah diakrualkan.", debit: KODE.UTANG_AKRUAL, kredit: KODE.KAS },

    // ── Jurnal penyesuaian ──
    { id: "akrual_gaji", tipe: "Penyesuaian", label: "Akrual Beban Gaji (belum dibayar)", hint: "Gaji periode berjalan yang belum dibayar sampai akhir periode.", debit: KODE.BEBAN_GAJI, kredit: KODE.UTANG_AKRUAL },
    { id: "akrual_operasional", tipe: "Penyesuaian", label: "Akrual Beban Operasional (belum dibayar)", hint: "Listrik/air/perawatan yang sudah terjadi tetapi belum dibayar.", debit: KODE.BEBAN_OPERASIONAL, kredit: KODE.UTANG_AKRUAL },
    { id: "akrual_lainnya", tipe: "Penyesuaian", label: "Akrual Beban Lainnya (belum dibayar)", hint: "Beban lain yang sudah terjadi tetapi belum dibayar.", debit: KODE.BEBAN_LAINNYA, kredit: KODE.UTANG_AKRUAL },
    { id: "beban_dimuka_terpakai", tipe: "Penyesuaian", label: "Beban Dibayar di Muka yang Sudah Terpakai", hint: "Bagian beban dibayar di muka yang manfaatnya sudah habis pada periode ini.", debit: KODE.BEBAN_OPERASIONAL, kredit: KODE.BEBAN_DIMUKA },
    { id: "persediaan_akhir", tipe: "Penyesuaian", label: "Persediaan Akhir Bahan Baku", hint: "Isi nilai bahan baku yang masih tersisa (hasil stok opname). Selisih dengan saldo persediaan dijurnal otomatis dan menentukan HPP.", debit: KODE.PERSEDIAAN, kredit: KODE.PEMBELIAN, persediaanAkhir: true },
];

export const TEMPLATE_MAP: Record<string, TemplateJurnal> = Object.fromEntries(TEMPLATE_JURNAL.map((t) => [t.id, t]));
