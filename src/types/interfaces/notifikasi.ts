export type NotifikasiJenis =
    | "produk_timeline"
    | "jasa_timeline"
    | "jasa_bayar"
    | "refund_disetujui"
    | "refund_ditolak";

export interface NotifikasiItem {
    id: string;
    jenis: NotifikasiJenis;
    judul: string;
    pesan: string;
    tanggal: string;
    href: string;
    thumbnail?: string;
}