export interface AlamatData {
    alamat_id: string;
    nama_penerima: string;
    nomor_telepon: string;
    alamat_lengkap: string;
    kota: string;
    kecamatan: string;
    provinsi: string;
    kota_id: number | null;
    kode_pos: string;
    isUtama: boolean;
}

export interface AlamatPayload {
    nama_penerima: string;
    nomor_telepon: string;
    alamat_lengkap: string;
    kota: string;
    kecamatan: string;
    provinsi: string;
    kota_id: number | null;
    kode_pos: string;
    isUtama?: boolean;
}