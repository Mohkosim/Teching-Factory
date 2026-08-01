export interface ProdukItem {
    produk_id: string;
    jurusan_id: string;
    nama_produk: string;
    deskripsi: string | null;
    fotos: string[];
    harga: number;
    status: "TERSEDIA" | "HABIS" | "NONAKTIF";
    view_count: number;
    sold_count: number;
    stok: number;
    kondisi: string | null;
}