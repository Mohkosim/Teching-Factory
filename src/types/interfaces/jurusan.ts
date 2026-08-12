export interface JurusanListItem {
  jurusan_id: string;
  nama_jurusan: string;
  deskripsi: string | null;
  jumlahProduk: number;
}

export interface JurusanListResult {
  data: JurusanListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export type JurusanSortOption =
  | "terbaru"
  | "nama_asc"
  | "nama_desc"
  | "produk_terbanyak";

export interface JurusanDetailData {
  jurusan_id: string;
  nama_jurusan: string;
  deskripsi: string | null;
  kepala_jurusan: string | null;
  jam_operasional: string | null;

  img: string | null;

  smk_id: string;
  smk_nama: string;

  jumlahBarang: number;
  jumlahJasa: number;
}