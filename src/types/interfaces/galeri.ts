export interface GaleriItem {
    galeri_id: string;
    judul: string;
    deskripsi: string | null;
    kategori: "Pameran" | "Lomba" | "Pelatihan" | "Kunjungan";
    image: string;
    user: {
      name: string;
    };
}

export interface GaleriListResult {
  data: GaleriItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export type GaleriSortOption = "terbaru" | "terlama" | "judul_asc" | "judul_desc";

export type GaleriKategoriFilter =
  | "Semua"
  | "Pameran"
  | "Lomba"
  | "Pelatihan"
  | "Kunjungan";