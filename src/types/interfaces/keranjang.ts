export interface KeranjangItem {
    id: string;
    produkId: string;
    toko: string;
    tokoId: string;
    tokoKotaId: number | null;
    jurusanId: string;
    nama: string;
    stok: number;
    harga: number;
    thumbnail: string;
    kuantitas: number;
    noWhatsapp?: string;
}