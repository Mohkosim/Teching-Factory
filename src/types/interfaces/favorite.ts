export interface FavoriteProduct {
    id: string;
    tipe: "produk";
    produkId: string;
    nama: string;
    harga: number;
    toko: string;
    gambar: string;
    badge?: string;
    rating?: number;
    terjual?: number;
    lokasi?: string;
}

export interface FavoriteJasa {
    id: string;
    tipe: "jasa";
    jasaId: string;
    toko: string;
    nama: string;
    harga: number;
    estimasi: string;
    thumbnail: string;
}

export type FavoriteItem = FavoriteProduct | FavoriteJasa;
export type TabKey = "produk" | "jasa";