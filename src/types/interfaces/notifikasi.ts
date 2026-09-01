export type NotifikasiJenis = "produk_timeline" | "jasa_timeline" | "jasa_bayar";

export interface NotifikasiItem {
    id: string;
    jenis: NotifikasiJenis;
    judul: string;
    pesan: string;
    tanggal: string;
    href: string;
    thumbnail?: string;
}