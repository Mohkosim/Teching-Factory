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

    jurusan_id: string;
    jurusan_smk_id: string;
    jurusan_smk_nama: string;
    nama_jurusan?: string;
    status_publikasi?: "Pending" | "Published" | "Revisi";
    catatan_revisi?: string | null;
    portofolio: PortofolioItem[];
}

export interface PortofolioItem {
  portofolio_id: string;
  file_path: string;
  deskripsi: string | null;
}


export interface JasaListItem {
  jasa_id: string;
  produk_id: string;
  nama_jasa: string;
  harga: number;
  foto: string | null;
  estimasi_pengerjaan: string | null;
  total_project: number;
  jurusan_nama: string;
  smk_nama: string;
  jumlahReview: number;
}

export interface JasaListResult {
  data: JasaListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export type JasaSortOption =
  | "terbaru"
  | "nama_asc"
  | "nama_desc"
  | "harga_asc"
  | "harga_desc"
  | "terlaris";

export type ProdukTypeFilter = "semua" | "produk" | "jasa";