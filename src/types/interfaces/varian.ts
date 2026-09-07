export interface VarianOpsiRecord {
    opsi_id: string;
    grup_id: string;
    nama: string;
    gambar: string | null;
    urutan: number;
}

export interface VarianGrupRecord {
    grup_id: string;
    produk_id: string;
    nama: string;
    urutan: number;
    opsi: VarianOpsiRecord[];
}

export interface VarianKombinasiOpsiRecord {
    id: string;
    kombinasi_id: string;
    opsi_id: string;
    opsi: VarianOpsiRecord;
}

export interface VarianKombinasiRecord {
    kombinasi_id: string;
    produk_id: string;
    harga: number;
    stok: number;
    sku: string | null;
    gambar: string | null;
    aktif: boolean;
    opsi: VarianKombinasiOpsiRecord[];
}

export interface GetVarianResponse {
    grup: VarianGrupRecord[];
    kombinasi: VarianKombinasiRecord[];
}

export interface VarianOpsiPublik {
    opsi_id: string;
    nama: string;
}

export interface VarianGrupPublik {
    grup_id: string;
    nama: string;
    opsi: VarianOpsiPublik[];
}

export interface VarianKombinasiPublik {
    kombinasi_id: string;
    harga: number;
    stok: number;
    gambar: string | null;
    opsiIds: string[];
}