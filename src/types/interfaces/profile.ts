export interface ProfileData {
    user_id: string;
    name: string;
    email: string;
    img: string | null;
    gender?: "Laki_laki" | "Perempuan" | null;

    // Khusus AdminSMK
    kepala_sekolah?: string | null;
    deskripsi_smk?: string | null;
    alamat?: string | null;
    kecamatan?: string | null;
    kota?: string | null;
    kota_id?: number | null; 
    kode_pos?: string | null; 
    provinsi?: string | null;
    tahun_berdiri?: number | null;

    // Khusus AdminJurusan
    phone?: string | null;
    deskripsi?: string | null;
    kepala_jurusan?: string | null;
    jam_operasional?: string | null;
}

export interface dataSMK {
    smk_id: string;
    nama_smk: string | null;
    alamat: string;
    kota: string;
    provinsi: string;
    tahun_berdiri: number;
    status_verifikasi: boolean;
}

export interface dataJurusan {
    jurusan_id: string;
    smk_id: string;
    nama_jurusan: string;
    deskripsi: string | null;
    kepala_jurusan: string | null;
    jam_operasional: string | null;
}