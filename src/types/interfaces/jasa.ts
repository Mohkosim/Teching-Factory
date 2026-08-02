export interface JasaItem {
    jasa_id: string;
    produk_id: string;
    nama_jasa: string;
    deskripsi: string | null;
    harga: number;
    status: "Tersedia" | "Habis" | "Nonaktif";
    estimasi_pengerjaan: string | null;
    total_project: number;
    view_count: number;
    fotos: string[];

    nama_jurusan?: string;
    status_publikasi?: "Pending" | "Published" | "Revisi";
    catatan_revisi?: string | null;
}