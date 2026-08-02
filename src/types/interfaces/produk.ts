export interface ProdukItem {
    produk_id: string;
    jurusan_id: string;
    nama_produk: string;
    deskripsi: string | null;
    fotos: string[];
    harga: number;
    status: "Tersedia" | "Habis" | "Nonaktif";
    view_count: number;
    sold_count: number;
    stok: number;
    kondisi: string | null;

    nama_jurusan?: string;
    status_publikasi?: "Pending" | "Published" | "Revisi";
    catatan_revisi?: string | null;
}