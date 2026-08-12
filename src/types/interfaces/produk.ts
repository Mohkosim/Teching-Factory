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

    // Field tambahan untuk tampilan card publik (list produk & jasa)
    gambar?: string;
    badge?: string;
    rating?: number;
    jumlahReview?: number;
    sekolah?: string;
}

export interface ProdukListItem {
  produk_id: string;
  nama_produk: string;
  harga: number;
  foto: string | null;
  jurusan_nama: string;
  smk_nama: string;
  rating: number;
  jumlahReview: number;
}

export interface ProdukListResult {
  data: ProdukItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export type ProdukSortOption =
  | "terbaru"
  | "nama_asc"
  | "nama_desc"
  | "harga_asc"
  | "harga_desc"
  | "terlaris";

export type ProdukTypeFilter = "semua" | "produk" | "jasa";

export interface GetProdukListParams {
  jurusanId?: string;
  search?: string;
  sort?: ProdukSortOption;
  page?: number;
  perPage?: number;
}