export interface SMKListItem {
  smk_id: string;
  nama_smk: string;
  img: string | null;

  kota: string;
  provinsi: string;
  status_verifikasi: boolean;
  jumlahJurusan: number;
}

export interface SMKListResult {
  data: SMKListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export type SMKSortOption = "terbaru" | "nama_asc" | "nama_desc" | "jurusan_terbanyak";

export interface SMKDetailData {
  smk_id: string;
  nama_smk: string;
  img: string | null;
  deskripsi: string | null;
  alamat: string;
  kota: string;
  provinsi: string;
  map_link: string | null;
  status_verifikasi: boolean;
  jumlahJurusan: number;
}