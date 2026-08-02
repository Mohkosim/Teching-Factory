export interface GaleriItem {
    galeri_id: string;
    judul: string;
    deskripsi: string | null;
    kategori: "Pameran" | "Lomba" | "Pelatihan" | "Kunjungan";
    image: string;
}