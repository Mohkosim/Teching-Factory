export interface JasaItem {
    jasa_id: string;
    produk_id: string;
    nama_jasa: string;
    deskripsi: string | null;
    harga: number;
    status: "TERSEDIA" | "HABIS" | "NONAKTIF";
    estimasi_pengerjaan: string | null;
    total_project: number;
    view_count: number;
    fotos: string[];
}